/**
 * Credential Manager
 * 
 * Centralized credential storage and management with OAuth token refresh.
 * Uses database for persistence with in-memory caching.
 */

import type {
  Credentials,
  OAuthCredentials,
  ApiKeyCredentials,
  ServiceAccountCredentials,
  ProviderId,
  StoredCredential,
} from "./types";
import { getProviderAdapter } from "./adapters";
import { createError } from "./rate-limit";

// ============================================================================
// In-Memory Cache
// ============================================================================

/**
 * Simple in-memory credential cache
 * Key: `${userId}:${providerId}` or `${userId}:${providerId}:${credentialId}`
 */
const credentialCache = new Map<string, {
  credential: StoredCredential;
  cachedAt: number;
}>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Credential Manager Class
// ============================================================================

export class CredentialManager {
  private database: CredentialStore;
  
  constructor(database: CredentialStore) {
    this.database = database;
  }
  
  /**
   * Get credentials for a user and provider
   * Automatically refreshes OAuth tokens if expired
   */
  async getCredentials(
    userId: string,
    provider: ProviderId,
    credentialId?: string
  ): Promise<Credentials | null> {
    const cacheKey = credentialId 
      ? `${userId}:${provider}:${credentialId}`
      : `${userId}:${provider}`;
    
    // Check cache first
    const cached = credentialCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return this.ensureValidCredentials(cached.credential.credentials, provider);
    }
    
    // Load from database
    const stored = credentialId
      ? await this.database.getCredentialById(credentialId)
      : await this.database.getDefaultCredential(userId, provider);
    
    if (!stored) {
      return null;
    }
    
    // Ensure credentials are valid (refresh if needed)
    const validCredentials = await this.ensureValidCredentials(stored.credentials, provider);
    
    // Update stored credentials if they were refreshed
    if (validCredentials !== stored.credentials) {
      await this.database.updateCredentials(stored.id, validCredentials);
      stored.credentials = validCredentials;
    }
    
    // Update cache
    credentialCache.set(cacheKey, {
      credential: stored,
      cachedAt: Date.now(),
    });
    
    return validCredentials;
  }
  
  /**
   * Store new credentials for a user
   */
  async storeCredentials(
    userId: string,
    provider: ProviderId,
    credentials: Credentials,
    name: string
  ): Promise<StoredCredential> {
    const stored = await this.database.createCredential({
      userId,
      provider,
      name,
      credentials,
    });
    
    // Invalidate cache
    this.invalidateCache(userId, provider);
    
    return stored;
  }
  
  /**
   * Update existing credentials
   */
  async updateCredentials(
    credentialId: string,
    credentials: Credentials
  ): Promise<void> {
    const stored = await this.database.getCredentialById(credentialId);
    if (!stored) {
      throw createError("NOT_FOUND", "Credential not found");
    }
    
    await this.database.updateCredentials(credentialId, credentials);
    
    // Invalidate cache
    this.invalidateCache(stored.userId, stored.provider);
  }
  
  /**
   * Delete credentials
   */
  async deleteCredentials(credentialId: string): Promise<void> {
    const stored = await this.database.getCredentialById(credentialId);
    if (stored) {
      await this.database.deleteCredential(credentialId);
      this.invalidateCache(stored.userId, stored.provider);
    }
  }
  
  /**
   * List all credentials for a user
   */
  async listCredentials(
    userId: string,
    provider?: ProviderId
  ): Promise<StoredCredential[]> {
    return this.database.listCredentials(userId, provider);
  }
  
  /**
   * Ensure credentials are valid, refreshing OAuth tokens if needed
   */
  private async ensureValidCredentials(
    credentials: Credentials,
    provider: ProviderId
  ): Promise<Credentials> {
    if (credentials.type !== "oauth2") {
      return credentials;
    }
    
    const oauth = credentials as OAuthCredentials;
    
    // Check if token is expired (with 5 minute buffer)
    const expiresAt = oauth.expiresAt;
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    if (Date.now() >= expiresAt - buffer) {
      // Token is expired or about to expire, refresh it
      const adapter = getProviderAdapter(provider);
      if (adapter.refreshCredentials) {
        return adapter.refreshCredentials(oauth);
      }
    }
    
    return credentials;
  }
  
  /**
   * Invalidate cached credentials
   */
  private invalidateCache(userId: string, provider: ProviderId): void {
    const prefix = `${userId}:${provider}`;
    for (const key of credentialCache.keys()) {
      if (key.startsWith(prefix)) {
        credentialCache.delete(key);
      }
    }
  }
  
  /**
   * Clear all cached credentials
   */
  clearCache(): void {
    credentialCache.clear();
  }
}

// ============================================================================
// Credential Store Interface (Database Abstraction)
// ============================================================================

export interface CredentialStore {
  getCredentialById(id: string): Promise<StoredCredential | null>;
  getDefaultCredential(userId: string, provider: ProviderId): Promise<StoredCredential | null>;
  listCredentials(userId: string, provider?: ProviderId): Promise<StoredCredential[]>;
  createCredential(data: {
    userId: string;
    provider: ProviderId;
    name: string;
    credentials: Credentials;
  }): Promise<StoredCredential>;
  updateCredentials(id: string, credentials: Credentials): Promise<void>;
  deleteCredential(id: string): Promise<void>;
}

// ============================================================================
// Drizzle Credential Store Implementation
// ============================================================================

import { database } from "../database";
import { eq, and } from "drizzle-orm";
import { credentials as credentialsTable } from "@/schema";

export class DrizzleCredentialStore implements CredentialStore {
  async getCredentialById(id: string): Promise<StoredCredential | null> {
    const result = await database
      .select()
      .from(credentialsTable)
      .where(eq(credentialsTable.id, id))
      .limit(1);
    
    if (result.length === 0) return null;
    return this.mapToStoredCredential(result[0]);
  }
  
  async getDefaultCredential(
    userId: string,
    provider: ProviderId
  ): Promise<StoredCredential | null> {
    const result = await database
      .select()
      .from(credentialsTable)
      .where(
        and(
          eq(credentialsTable.userId, userId),
          eq(credentialsTable.provider, provider)
        )
      )
      .orderBy(credentialsTable.createdAt)
      .limit(1);
    
    if (result.length === 0) return null;
    return this.mapToStoredCredential(result[0]);
  }
  
  async listCredentials(
    userId: string,
    provider?: ProviderId
  ): Promise<StoredCredential[]> {
    const conditions = [eq(credentialsTable.userId, userId)];
    if (provider) {
      conditions.push(eq(credentialsTable.provider, provider));
    }
    
    const result = await database
      .select()
      .from(credentialsTable)
      .where(and(...conditions))
      .orderBy(credentialsTable.createdAt);
    
    return result.map(this.mapToStoredCredential);
  }
  
  async createCredential(data: {
    userId: string;
    provider: ProviderId;
    name: string;
    credentials: Credentials;
  }): Promise<StoredCredential> {
    const [result] = await database
      .insert(credentialsTable)
      .values({
        userId: data.userId,
        provider: data.provider,
        name: data.name,
        credentials: data.credentials,
      })
      .returning();
    
    return this.mapToStoredCredential(result);
  }
  
  async updateCredentials(id: string, credentials: Credentials): Promise<void> {
    await database
      .update(credentialsTable)
      .set({
        credentials,
        updatedAt: new Date(),
      })
      .where(eq(credentialsTable.id, id));
  }
  
  async deleteCredential(id: string): Promise<void> {
    await database
      .delete(credentialsTable)
      .where(eq(credentialsTable.id, id));
  }
  
  private mapToStoredCredential(row: {
    id: string;
    userId: string;
    provider: string;
    name: string;
    credentials: unknown;
    createdAt: Date;
    updatedAt: Date | null;
  }): StoredCredential {
    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider as ProviderId,
      name: row.name,
      credentials: row.credentials as Credentials,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let credentialManager: CredentialManager | null = null;

export function getCredentialManager(): CredentialManager {
  if (!credentialManager) {
    credentialManager = new CredentialManager(new DrizzleCredentialStore());
  }
  return credentialManager;
}

// ============================================================================
// Helper Functions for Creating Credentials
// ============================================================================

export function createOAuthCredentials(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  scope: string | string[];
}): OAuthCredentials {
  return {
    type: "oauth2",
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: Date.now() + params.expiresIn * 1000,
    tokenType: "Bearer",
    scope: Array.isArray(params.scope) ? params.scope : params.scope.split(" "),
  };
}

export function createApiKeyCredentials(apiKey: string): ApiKeyCredentials {
  return {
    type: "api_key",
    apiKey,
  };
}

export function createServiceAccountCredentials(params: {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}): ServiceAccountCredentials {
  return {
    type: "service_account",
    clientEmail: params.clientEmail,
    privateKey: params.privateKey,
    projectId: params.projectId,
  };
}


