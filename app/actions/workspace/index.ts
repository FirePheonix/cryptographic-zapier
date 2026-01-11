"use server";

import { eq, and, desc } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import {
  workspaces,
  workspaceVersions,
  workspaceSecrets,
  organizationMembers,
  auditLogs,
} from "@/schema";
import { stripSecretsFromContent } from "@/lib/collaboration/secrets";

// Types
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  organizationId: string;
  initialContent?: {
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
  };
}

export interface CloneWorkspaceInput {
  sourceWorkspaceId: string;
  name: string;
  description?: string;
}

// Create workspace
export async function createWorkspace(input: CreateWorkspaceInput) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check org membership (must be accepted)
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    // Create workspace
    const [workspace] = await database
      .insert(workspaces)
      .values({
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        currentVersion: 1,
      })
      .returning();

    // Create initial version
    const content = input.initialContent || { nodes: [], edges: [] };
    await database.insert(workspaceVersions).values({
      workspaceId: workspace.id,
      version: 1,
      content,
      message: "Initial version",
      createdByUserId: user.id,
    });

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: input.organizationId,
      workspaceId: workspace.id,
      userId: user.id,
      action: "workspace_created",
      details: { name: input.name },
    });

    return { success: true, data: workspace };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get workspace with latest version
export async function getWorkspace(workspaceId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check org membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized to view this workspace");

    // Get latest version
    const latestVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, workspaceId),
        eq(workspaceVersions.version, workspace.currentVersion)
      ),
    });

    // Get user's secrets for this workspace
    const secrets = await database.query.workspaceSecrets.findMany({
      where: and(
        eq(workspaceSecrets.workspaceId, workspaceId),
        eq(workspaceSecrets.userId, user.id)
      ),
    });

    return {
      success: true,
      data: {
        ...workspace,
        content: latestVersion?.content,
        secrets: secrets.map((s) => ({
          credentialRef: s.credentialRef,
          name: s.name,
          provider: s.provider,
          isBound: s.isBound,
        })),
        userRole: membership.role,
      },
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get workspaces for an organization
export async function getOrgWorkspaces(organizationId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    const orgWorkspaces = await database.query.workspaces.findMany({
      where: eq(workspaces.organizationId, organizationId),
      orderBy: [desc(workspaces.createdAt)],
    });

    return { success: true, data: orgWorkspaces };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Clone (fork) a workspace
export async function cloneWorkspace(input: CloneWorkspaceInput) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Get source workspace
    const sourceWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, input.sourceWorkspaceId),
    });
    if (!sourceWorkspace) throw new Error("Source workspace not found");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, sourceWorkspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized to clone this workspace");

    // Get source version content
    const sourceVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, input.sourceWorkspaceId),
        eq(workspaceVersions.version, sourceWorkspace.currentVersion)
      ),
    });

    // Strip secrets from content for the clone
    const strippedContent = stripSecretsFromContent(sourceVersion?.content);

    // Create forked workspace
    const [forkedWorkspace] = await database
      .insert(workspaces)
      .values({
        name: input.name,
        description: input.description || sourceWorkspace.description,
        organizationId: sourceWorkspace.organizationId,
        parentWorkspaceId: sourceWorkspace.id,
        forkedFromVersion: sourceWorkspace.currentVersion,
        forkedByUserId: user.id,
        currentVersion: 1,
      })
      .returning();

    // Create initial version with stripped content
    await database.insert(workspaceVersions).values({
      workspaceId: forkedWorkspace.id,
      version: 1,
      content: strippedContent,
      message: `Forked from ${sourceWorkspace.name} v${sourceWorkspace.currentVersion}`,
      createdByUserId: user.id,
    });

    // Create unbound secret references for all credential refs in the content
    const credentialRefs = extractCredentialRefs(strippedContent);
    for (const ref of credentialRefs) {
      await database.insert(workspaceSecrets).values({
        workspaceId: forkedWorkspace.id,
        userId: user.id,
        credentialRef: ref.credentialRef,
        name: ref.name || `Unbound ${ref.provider} credential`,
        provider: ref.provider,
        isBound: false,
      });
    }

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: sourceWorkspace.organizationId,
      workspaceId: forkedWorkspace.id,
      userId: user.id,
      action: "workspace_cloned",
      details: {
        sourceWorkspaceId: sourceWorkspace.id,
        sourceVersion: sourceWorkspace.currentVersion,
      },
    });

    return { success: true, data: forkedWorkspace };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Save new version of workspace
export async function saveWorkspaceVersion(
  workspaceId: string,
  content: {
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
  },
  message?: string
) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not authorized to edit this workspace");

    // For main workspaces, only owners and reviewers can save directly
    if (!workspace.parentWorkspaceId && membership.role === "contributor") {
      throw new Error("Contributors must create a fork and submit a pull request");
    }

    const newVersion = workspace.currentVersion + 1;

    // Strip secrets before saving
    const strippedContent = stripSecretsFromContent(content);

    // Create new version
    await database.insert(workspaceVersions).values({
      workspaceId,
      version: newVersion,
      content: strippedContent,
      message: message || `Version ${newVersion}`,
      createdByUserId: user.id,
    });

    // Update workspace current version
    await database
      .update(workspaces)
      .set({ currentVersion: newVersion, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: workspace.organizationId,
      workspaceId,
      userId: user.id,
      action: "workspace_version_created",
      details: { version: newVersion, message },
    });

    return { success: true, data: { version: newVersion } };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get workspace version history
export async function getWorkspaceHistory(workspaceId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized");

    const versions = await database.query.workspaceVersions.findMany({
      where: eq(workspaceVersions.workspaceId, workspaceId),
      orderBy: [desc(workspaceVersions.version)],
    });

    // Don't include content in history list (too large)
    return {
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        version: v.version,
        message: v.message,
        createdByUserId: v.createdByUserId,
        createdAt: v.createdAt,
      })),
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Helper to extract credential references from content
function extractCredentialRefs(content: {
  nodes: Array<{ data: Record<string, unknown> }>;
} | null | undefined): Array<{ credentialRef: string; provider: string; name?: string }> {
  if (!content?.nodes) return [];

  const refs: Array<{ credentialRef: string; provider: string; name?: string }> = [];

  for (const node of content.nodes) {
    const data = node.data;
    if (data.credentialRef && typeof data.credentialRef === "string") {
      refs.push({
        credentialRef: data.credentialRef,
        provider: (data.provider as string) || "unknown",
        name: data.credentialName as string | undefined,
      });
    }
  }

  return refs;
}

// Commit changes from fork directly to main (owners and reviewers only)
export async function commitDirectlyToMain(input: {
  forkWorkspaceId: string;
  commitMessage: string;
}) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Get the fork workspace
    const forkWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, input.forkWorkspaceId),
    });
    if (!forkWorkspace) throw new Error("Fork workspace not found");

    // Must be a fork
    if (!forkWorkspace.parentWorkspaceId) {
      throw new Error("This is not a fork workspace");
    }

    // Check membership and role
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, forkWorkspace.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    // Only owners and reviewers can commit directly
    if (membership.role === "contributor") {
      throw new Error("Contributors cannot commit directly. Please create a pull request instead.");
    }

    // Get the parent (main) workspace
    const mainWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, forkWorkspace.parentWorkspaceId),
    });
    if (!mainWorkspace) throw new Error("Main workspace not found");

    // Get fork's current content
    const forkVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, forkWorkspace.id),
        eq(workspaceVersions.version, forkWorkspace.currentVersion)
      ),
    });
    if (!forkVersion?.content) throw new Error("Fork has no content");

    // Create new version on main workspace
    const newVersion = mainWorkspace.currentVersion + 1;
    const strippedContent = stripSecretsFromContent(forkVersion.content);

    await database.insert(workspaceVersions).values({
      workspaceId: mainWorkspace.id,
      version: newVersion,
      content: strippedContent,
      message: input.commitMessage,
      createdByUserId: user.id,
    });

    // Update main workspace version
    await database
      .update(workspaces)
      .set({ currentVersion: newVersion, updatedAt: new Date() })
      .where(eq(workspaces.id, mainWorkspace.id));

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: mainWorkspace.organizationId,
      workspaceId: mainWorkspace.id,
      userId: user.id,
      action: "workspace_version_created",
      details: {
        version: newVersion,
        message: input.commitMessage,
        committedFrom: forkWorkspace.id,
        directCommit: true,
      },
    });

    return { success: true, data: { mainWorkspaceId: mainWorkspace.id, newVersion } };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get a specific version of a workspace
export async function getWorkspaceVersion(workspaceId: string, version: number) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized");

    const workspaceVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, workspaceId),
        eq(workspaceVersions.version, version)
      ),
    });

    if (!workspaceVersion) throw new Error("Version not found");

    return {
      success: true,
      data: {
        id: workspaceVersion.id,
        version: workspaceVersion.version,
        message: workspaceVersion.message,
        content: workspaceVersion.content,
        createdByUserId: workspaceVersion.createdByUserId,
        createdAt: workspaceVersion.createdAt,
      },
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Restore workspace to a previous version
export async function restoreWorkspaceVersion(workspaceId: string, version: number) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check membership and role
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    // Only owners and reviewers can restore
    if (membership.role === "contributor") {
      throw new Error("Contributors cannot restore versions");
    }

    // Get the version to restore
    const targetVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, workspaceId),
        eq(workspaceVersions.version, version)
      ),
    });
    if (!targetVersion) throw new Error("Version not found");

    // Create a new version with the restored content
    const newVersion = workspace.currentVersion + 1;

    await database.insert(workspaceVersions).values({
      workspaceId,
      version: newVersion,
      content: targetVersion.content,
      message: `Restored from version ${version}`,
      createdByUserId: user.id,
    });

    // Update workspace current version
    await database
      .update(workspaces)
      .set({ currentVersion: newVersion, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: workspace.organizationId,
      workspaceId,
      userId: user.id,
      action: "workspace_version_created",
      details: {
        version: newVersion,
        restoredFrom: version,
        message: `Restored from version ${version}`,
      },
    });

    return { success: true, data: { newVersion } };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}


