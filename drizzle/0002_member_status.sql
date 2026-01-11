-- Migration: Add member status for invitation system
-- ============================================================================

-- Create member status enum
CREATE TYPE member_status AS ENUM ('pending', 'accepted', 'rejected');

-- Add status column to organization_member
ALTER TABLE organization_member 
ADD COLUMN status member_status NOT NULL DEFAULT 'pending';

-- Update existing members to 'accepted' (they were added before this system)
UPDATE organization_member 
SET status = 'accepted' 
WHERE joined_at IS NOT NULL;

-- Create index for efficient pending invitation lookups
CREATE INDEX idx_org_member_email_status ON organization_member(email, status);
