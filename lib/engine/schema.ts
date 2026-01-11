/**
 * Engine Database Schema
 * 
 * Additional tables for the automation engine (credentials storage).
 */

import { sql } from "drizzle-orm";
import {
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { Credentials, ProviderId } from "./types";

const uuid = sql`uuid_generate_v4()`;

// ============================================================================
// Credentials Table
// ============================================================================

/**
 * Stores encrypted credentials for providers (OAuth, API keys, etc.)
 */
export const credentials = pgTable("credential", {
  id: text("id").primaryKey().default(uuid).notNull(),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider").notNull().$type<ProviderId>(),
  name: varchar("name").notNull(),
  // In production, this should be encrypted at rest
  credentials: json("credentials").$type<Credentials>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CredentialRow = typeof credentials.$inferSelect;
export type NewCredentialRow = typeof credentials.$inferInsert;


