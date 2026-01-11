import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const uuid = sql`uuid_generate_v4()`;

// ============================================================================
// Enums
// ============================================================================

export const orgRoleEnum = pgEnum("org_role", ["owner", "reviewer", "contributor"]);
export const prStatusEnum = pgEnum("pr_status", ["open", "approved", "rejected", "merged"]);
export const auditActionEnum = pgEnum("audit_action", [
  "org_created",
  "org_member_invited",
  "org_member_removed",
  "workspace_created",
  "workspace_cloned",
  "workspace_version_created",
  "pr_created",
  "pr_approved",
  "pr_rejected",
  "pr_merged",
  "secret_created",
  "secret_updated",
  "secret_deleted",
]);

// ============================================================================
// Organizations
// ============================================================================

export const organizations = pgTable("organization", {
  id: text("id").primaryKey().default(uuid).notNull(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: varchar("description"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Member invitation status
export const memberStatusEnum = pgEnum("member_status", ["pending", "accepted", "rejected"]);

export const organizationMembers = pgTable("organization_member", {
  id: text("id").primaryKey().default(uuid).notNull(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  email: varchar("email").notNull(),
  role: orgRoleEnum("role").notNull().default("contributor"),
  status: memberStatusEnum("status").notNull().default("pending"),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
});

// ============================================================================
// Workspaces (Git-like repositories for workflows)
// ============================================================================

export const workspaces = pgTable("workspace", {
  id: text("id").primaryKey().default(uuid).notNull(),
  name: varchar("name").notNull(),
  description: varchar("description"),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  // For forked workspaces, track the parent
  parentWorkspaceId: text("parent_workspace_id"),
  forkedFromVersion: integer("forked_from_version"),
  forkedByUserId: varchar("forked_by_user_id"),
  // Current version number (incremented on each merge/update)
  currentVersion: integer("current_version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const workspaceVersions = pgTable("workspace_version", {
  id: text("id").primaryKey().default(uuid).notNull(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  // The workflow content at this version
  content: json("content").$type<{
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  }>(),
  message: varchar("message"), // Commit message
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Pull Requests
// ============================================================================

export const pullRequests = pgTable("pull_request", {
  id: text("id").primaryKey().default(uuid).notNull(),
  title: varchar("title").notNull(),
  description: varchar("description"),
  // Source workspace (the fork)
  sourceWorkspaceId: text("source_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceVersion: integer("source_version").notNull(),
  // Target workspace (the main workspace)
  targetWorkspaceId: text("target_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  targetVersion: integer("target_version").notNull(),
  status: prStatusEnum("status").notNull().default("open"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  reviewedByUserId: varchar("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at"),
  mergedAt: timestamp("merged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const pullRequestComments = pgTable("pull_request_comment", {
  id: text("id").primaryKey().default(uuid).notNull(),
  pullRequestId: text("pull_request_id").notNull().references(() => pullRequests.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  // Optional: reference a specific node in the diff
  nodeId: varchar("node_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// ============================================================================
// Workspace Secrets (Isolated credentials per workspace/user)
// ============================================================================

export const workspaceSecrets = pgTable("workspace_secret", {
  id: text("id").primaryKey().default(uuid).notNull(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  // Opaque reference ID used in workflow nodes (e.g., "cred_abc123")
  credentialRef: varchar("credential_ref").notNull(),
  // Reference to the actual credential in the credentials table
  credentialId: text("credential_id").references(() => credentials.id, { onDelete: "set null" }),
  // Human-readable name for the secret binding
  name: varchar("name").notNull(),
  // Provider type (google, openai, etc.)
  provider: varchar("provider").notNull(),
  // Whether this is bound to an actual credential
  isBound: boolean("is_bound").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// ============================================================================
// Audit Logs
// ============================================================================

export const auditLogs = pgTable("audit_log", {
  id: text("id").primaryKey().default(uuid).notNull(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  pullRequestId: text("pull_request_id").references(() => pullRequests.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull(),
  action: auditActionEnum("action").notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Workflows (Updated to support workspace integration)
// ============================================================================

// Workflows table - stores the workflow definition as JSON
export const workflows = pgTable("workflow", {
  id: text("id").primaryKey().default(uuid).notNull(),
  name: varchar("name").notNull(),
  description: varchar("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  // Stores the React Flow nodes and edges
  content: json("content").$type<{
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  }>(),
  userId: varchar("user_id").notNull(),
  // Whether the workflow is active/enabled
  enabled: boolean("enabled").notNull().default(true),
  // Optional: link to a workspace (for collaborative workflows)
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
});

// Workflow executions log - stores execution history
export const workflowExecutions = pgTable("workflow_execution", {
  id: text("id").primaryKey().default(uuid).notNull(),
  workflowId: text("workflow_id").notNull(),
  userId: varchar("user_id").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  // Input data from the trigger
  triggerInput: json("trigger_input"),
  // Final output or error
  result: json("result"),
  // Detailed step-by-step execution log
  executionLog: json("execution_log").$type<Array<{
    nodeId: string;
    nodeType: string;
    status: "success" | "error";
    input: unknown;
    output: unknown;
    error?: string;
    timestamp: string;
  }>>(),
});

// ============================================================================
// Credentials (for OAuth and API keys)
// ============================================================================

/**
 * Provider credential types
 */
type ProviderCredentials = 
  | { type: "oauth2"; accessToken: string; refreshToken: string; expiresAt: number; tokenType: string; scope: string[] }
  | { type: "api_key"; apiKey: string }
  | { type: "service_account"; clientEmail: string; privateKey: string; projectId: string };

/**
 * Stores credentials for providers (OAuth, API keys, etc.)
 * Note: In production, credentials should be encrypted at rest
 */
export const credentials = pgTable("credential", {
  id: text("id").primaryKey().default(uuid).notNull(),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider").notNull(), // google, openai, email, etc.
  name: varchar("name").notNull(),
  credentials: json("credentials").$type<ProviderCredentials>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// ============================================================================
// User Profile
// ============================================================================

export const profile = pgTable("profile", {
  id: text("id").primaryKey().notNull(),
  customerId: text("customer_id"),
  subscriptionId: text("subscription_id"),
  productId: text("product_id"),
  onboardedAt: timestamp("onboarded_at"),
});

// ============================================================================
// Legacy Tables (keeping for migration)
// ============================================================================

// Legacy projects table - keeping for migration, will be removed
export const projects = pgTable("project", {
  id: text("id").primaryKey().default(uuid).notNull(),
  name: varchar("name").notNull(),
  transcriptionModel: varchar("transcription_model").notNull(),
  visionModel: varchar("vision_model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  content: json("content"),
  userId: varchar("user_id").notNull(),
  image: varchar("image"),
  members: text("members").array(),
  welcomeProject: boolean("demo_project").notNull().default(false),
});
