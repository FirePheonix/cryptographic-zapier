-- Migration: Add Git-style collaboration support
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE org_role AS ENUM ('owner', 'reviewer', 'contributor');
CREATE TYPE pr_status AS ENUM ('open', 'approved', 'rejected', 'merged');
CREATE TYPE audit_action AS ENUM (
  'org_created',
  'org_member_invited',
  'org_member_removed',
  'workspace_created',
  'workspace_cloned',
  'workspace_version_created',
  'pr_created',
  'pr_approved',
  'pr_rejected',
  'pr_merged',
  'secret_created',
  'secret_updated',
  'secret_deleted'
);

-- ============================================================================
-- Organizations
-- ============================================================================

CREATE TABLE organization (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  description VARCHAR,
  owner_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

CREATE TABLE organization_member (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  role org_role NOT NULL DEFAULT 'contributor',
  invited_at TIMESTAMP DEFAULT NOW() NOT NULL,
  joined_at TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- Workspaces
-- ============================================================================

CREATE TABLE workspace (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  parent_workspace_id TEXT,
  forked_from_version INTEGER,
  forked_by_user_id VARCHAR,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- Add self-reference after table creation
ALTER TABLE workspace ADD CONSTRAINT fk_parent_workspace 
  FOREIGN KEY (parent_workspace_id) REFERENCES workspace(id) ON DELETE SET NULL;

CREATE TABLE workspace_version (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB,
  message VARCHAR,
  created_by_user_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, version)
);

-- ============================================================================
-- Pull Requests
-- ============================================================================

CREATE TABLE pull_request (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description VARCHAR,
  source_workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  source_version INTEGER NOT NULL,
  target_workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  target_version INTEGER NOT NULL,
  status pr_status NOT NULL DEFAULT 'open',
  created_by_user_id VARCHAR NOT NULL,
  reviewed_by_user_id VARCHAR,
  reviewed_at TIMESTAMP,
  merged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

CREATE TABLE pull_request_comment (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  pull_request_id TEXT NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  node_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- ============================================================================
-- Workspace Secrets
-- ============================================================================

CREATE TABLE workspace_secret (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  credential_ref VARCHAR NOT NULL,
  credential_id TEXT REFERENCES credential(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  is_bound BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP,
  UNIQUE(workspace_id, user_id, credential_ref)
);

-- ============================================================================
-- Audit Logs
-- ============================================================================

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT REFERENCES organization(id) ON DELETE SET NULL,
  workspace_id TEXT REFERENCES workspace(id) ON DELETE SET NULL,
  pull_request_id TEXT REFERENCES pull_request(id) ON DELETE SET NULL,
  user_id VARCHAR NOT NULL,
  action audit_action NOT NULL,
  details JSONB,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Update existing workflow table
-- ============================================================================

ALTER TABLE workflow ADD COLUMN workspace_id TEXT REFERENCES workspace(id) ON DELETE SET NULL;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_org_member_org_id ON organization_member(organization_id);
CREATE INDEX idx_org_member_user_id ON organization_member(user_id);
CREATE INDEX idx_workspace_org_id ON workspace(organization_id);
CREATE INDEX idx_workspace_parent_id ON workspace(parent_workspace_id);
CREATE INDEX idx_workspace_version_workspace_id ON workspace_version(workspace_id);
CREATE INDEX idx_pr_source_workspace ON pull_request(source_workspace_id);
CREATE INDEX idx_pr_target_workspace ON pull_request(target_workspace_id);
CREATE INDEX idx_pr_status ON pull_request(status);
CREATE INDEX idx_workspace_secret_workspace_user ON workspace_secret(workspace_id, user_id);
CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_request_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_secret ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see orgs they own or are members of
CREATE POLICY "Users can view their organizations" ON organization
  FOR SELECT USING (
    owner_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM organization_member 
      WHERE organization_id = organization.id 
      AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create organizations" ON organization
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Owners can update their organizations" ON organization
  FOR UPDATE USING (owner_id = auth.uid()::text);

CREATE POLICY "Owners can delete their organizations" ON organization
  FOR DELETE USING (owner_id = auth.uid()::text);

-- Organization Members: Members can see other members in their orgs
CREATE POLICY "Members can view org members" ON organization_member
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization 
      WHERE id = organization_member.organization_id 
      AND (
        owner_id = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM organization_member om 
          WHERE om.organization_id = organization.id 
          AND om.user_id = auth.uid()::text
        )
      )
    )
  );

CREATE POLICY "Owners can manage org members" ON organization_member
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization 
      WHERE id = organization_member.organization_id 
      AND owner_id = auth.uid()::text
    )
  );

-- Workspaces: Members can see workspaces in their orgs
CREATE POLICY "Members can view workspaces" ON workspace
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_member 
      WHERE organization_id = workspace.organization_id 
      AND user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM organization 
      WHERE id = workspace.organization_id 
      AND owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Members can create workspaces" ON workspace
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_member 
      WHERE organization_id = workspace.organization_id 
      AND user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM organization 
      WHERE id = workspace.organization_id 
      AND owner_id = auth.uid()::text
    )
  );

-- Workspace Secrets: Users can only see their own secrets
CREATE POLICY "Users can only view their own secrets" ON workspace_secret
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own secrets" ON workspace_secret
  FOR ALL USING (user_id = auth.uid()::text);

-- Audit Logs: Members can view audit logs for their orgs
CREATE POLICY "Members can view audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_member 
      WHERE organization_id = audit_log.organization_id 
      AND user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM organization 
      WHERE id = audit_log.organization_id 
      AND owner_id = auth.uid()::text
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (true);
