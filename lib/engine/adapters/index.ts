/**
 * Provider Adapters Index
 * 
 * Exports all provider adapters and provides a registry for lookup.
 */

import type { ProviderAdapter, ProviderId } from "../types";
import { googleAdapter, type GoogleAdapter } from "./google";
import { openaiAdapter, type OpenAIAdapter } from "./openai";
import { emailAdapter, type EmailAdapter } from "./email";
import { webhookAdapter, type WebhookAdapter } from "./webhook";
import { transformAdapter, type TransformAdapter } from "./transform";
import { flowAdapter, FlowAdapter } from "./flow";
import { alchemyAdapter, type AlchemyAdapter } from "./alchemy";
import { postgresAdapter, PostgresAdapter } from "./postgres";
import { coingateAdapter, type CoingateAdapter } from "./coingate";
import { agentAdapter, AgentAdapter } from "./agent";

// ============================================================================
// Provider Registry
// ============================================================================

// Union type for all adapter types
type AnyProviderAdapter = GoogleAdapter | OpenAIAdapter | EmailAdapter | WebhookAdapter | TransformAdapter | FlowAdapter | AlchemyAdapter | PostgresAdapter | CoingateAdapter | AgentAdapter;

/**
 * Registry of all available provider adapters
 */
const providerRegistry = new Map<ProviderId, AnyProviderAdapter>();
providerRegistry.set("google", googleAdapter);
providerRegistry.set("openai", openaiAdapter);
providerRegistry.set("email", emailAdapter);
providerRegistry.set("webhook", webhookAdapter);
providerRegistry.set("transform", transformAdapter);
providerRegistry.set("flow", flowAdapter);
providerRegistry.set("alchemy", alchemyAdapter);
providerRegistry.set("postgres", postgresAdapter);
providerRegistry.set("coingate", coingateAdapter);
providerRegistry.set("agent", agentAdapter);

/**
 * Get a provider adapter by ID
 */
export function getProviderAdapter(providerId: ProviderId): ProviderAdapter {
  const adapter = providerRegistry.get(providerId);
  if (!adapter) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return adapter;
}

/**
 * Get all registered provider IDs
 */
export function getRegisteredProviders(): ProviderId[] {
  return Array.from(providerRegistry.keys());
}

/**
 * Check if a provider is registered
 */
export function isProviderRegistered(providerId: string): providerId is ProviderId {
  return providerRegistry.has(providerId as ProviderId);
}

/**
 * Register a custom provider adapter
 */
export function registerProvider(providerId: ProviderId, adapter: AnyProviderAdapter): void {
  providerRegistry.set(providerId, adapter);
}

// ============================================================================
// Exports
// ============================================================================

export { googleAdapter } from "./google";
export { openaiAdapter } from "./openai";
export { emailAdapter } from "./email";
export { webhookAdapter } from "./webhook";
export { transformAdapter } from "./transform";
export { flowAdapter } from "./flow";
export { alchemyAdapter } from "./alchemy";
export { postgresAdapter } from "./postgres";
export { agentAdapter } from "./agent";
export { BaseProviderAdapter, makeRequest } from "./base";


