"use server";

import { eq, and, desc } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import {
  pullRequests,
  pullRequestComments,
  workspaces,
  workspaceVersions,
  organizationMembers,
  auditLogs,
} from "@/schema";
import { computeWorkflowDiff, applyDiff, type WorkflowDiff } from "@/lib/collaboration/diff";
import { stripSecretsFromContent, type WorkflowContent } from "@/lib/collaboration/secrets";

// Types
export interface CreatePRInput {
  title: string;
  description?: string;
  sourceWorkspaceId: string;
}

// Create Pull Request
export async function createPullRequest(input: CreatePRInput) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Get source workspace (the fork)
    const sourceWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, input.sourceWorkspaceId),
    });
    if (!sourceWorkspace) throw new Error("Source workspace not found");
    if (!sourceWorkspace.parentWorkspaceId) {
      throw new Error("Can only create PR from a forked workspace");
    }

    // Get target workspace (the main workspace)
    const targetWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, sourceWorkspace.parentWorkspaceId),
    });
    if (!targetWorkspace) throw new Error("Target workspace not found");

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, sourceWorkspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized");

    // Check for existing open PR
    const existingPR = await database.query.pullRequests.findFirst({
      where: and(
        eq(pullRequests.sourceWorkspaceId, input.sourceWorkspaceId),
        eq(pullRequests.status, "open")
      ),
    });
    if (existingPR) throw new Error("An open PR already exists for this fork");

    // Create PR
    const [pr] = await database
      .insert(pullRequests)
      .values({
        title: input.title,
        description: input.description,
        sourceWorkspaceId: input.sourceWorkspaceId,
        sourceVersion: sourceWorkspace.currentVersion,
        targetWorkspaceId: targetWorkspace.id,
        targetVersion: targetWorkspace.currentVersion,
        status: "open",
        createdByUserId: user.id,
      })
      .returning();

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: sourceWorkspace.organizationId,
      workspaceId: sourceWorkspace.id,
      pullRequestId: pr.id,
      userId: user.id,
      action: "pr_created",
      details: { title: input.title, targetWorkspaceId: targetWorkspace.id },
    });

    return { success: true, data: pr };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get Pull Request with diff
export async function getPullRequest(prId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const pr = await database.query.pullRequests.findFirst({
      where: eq(pullRequests.id, prId),
    });
    if (!pr) throw new Error("Pull request not found");

    // Get workspaces
    const sourceWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.sourceWorkspaceId),
    });
    const targetWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.targetWorkspaceId),
    });

    if (!sourceWorkspace || !targetWorkspace) {
      throw new Error("Workspace not found");
    }

    // Check membership
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, sourceWorkspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership) throw new Error("Not authorized");

    // Get version contents
    const sourceVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, pr.sourceWorkspaceId),
        eq(workspaceVersions.version, pr.sourceVersion)
      ),
    });
    const targetVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, pr.targetWorkspaceId),
        eq(workspaceVersions.version, pr.targetVersion)
      ),
    });

    // Compute diff
    const diff = computeWorkflowDiff(targetVersion?.content, sourceVersion?.content);

    // Get comments
    const comments = await database.query.pullRequestComments.findMany({
      where: eq(pullRequestComments.pullRequestId, prId),
      orderBy: [desc(pullRequestComments.createdAt)],
    });

    // Prepare workflow content for visual diff (strip secrets)
    const sourceContent = sourceVersion?.content
      ? stripSecretsFromContent(sourceVersion.content as WorkflowContent)
      : { nodes: [], edges: [] };
    const targetContent = targetVersion?.content
      ? stripSecretsFromContent(targetVersion.content as WorkflowContent)
      : { nodes: [], edges: [] };

    return {
      success: true,
      data: {
        ...pr,
        sourceWorkspace,
        targetWorkspace,
        diff,
        comments,
        canReview: membership.role === "owner" || membership.role === "reviewer",
        canMerge: membership.role === "owner" || membership.role === "reviewer",
        // Include full workflow content for visual diff
        sourceWorkflowContent: sourceContent,
        targetWorkflowContent: targetContent,
      },
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get PRs for a workspace
export async function getWorkspacePRs(workspaceId: string) {
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

    // Get PRs where this workspace is the target
    const prs = await database.query.pullRequests.findMany({
      where: eq(pullRequests.targetWorkspaceId, workspaceId),
      orderBy: [desc(pullRequests.createdAt)],
    });

    return { success: true, data: prs };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Approve PR
export async function approvePullRequest(prId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const pr = await database.query.pullRequests.findFirst({
      where: eq(pullRequests.id, prId),
    });
    if (!pr) throw new Error("Pull request not found");
    if (pr.status !== "open") throw new Error("PR is not open");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.targetWorkspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check if user can review (owner or reviewer)
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "reviewer")) {
      throw new Error("Only owners and reviewers can approve PRs");
    }

    // Update PR
    const [updated] = await database
      .update(pullRequests)
      .set({
        status: "approved",
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pullRequests.id, prId))
      .returning();

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: workspace.organizationId,
      workspaceId: workspace.id,
      pullRequestId: prId,
      userId: user.id,
      action: "pr_approved",
      details: {},
    });

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Reject PR
export async function rejectPullRequest(prId: string, reason?: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const pr = await database.query.pullRequests.findFirst({
      where: eq(pullRequests.id, prId),
    });
    if (!pr) throw new Error("Pull request not found");
    if (pr.status !== "open") throw new Error("PR is not open");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.targetWorkspaceId),
    });
    if (!workspace) throw new Error("Workspace not found");

    // Check if user can review
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, workspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "reviewer")) {
      throw new Error("Only owners and reviewers can reject PRs");
    }

    // Update PR
    const [updated] = await database
      .update(pullRequests)
      .set({
        status: "rejected",
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pullRequests.id, prId))
      .returning();

    // Add rejection comment if reason provided
    if (reason) {
      await database.insert(pullRequestComments).values({
        pullRequestId: prId,
        userId: user.id,
        content: `Rejected: ${reason}`,
      });
    }

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: workspace.organizationId,
      workspaceId: workspace.id,
      pullRequestId: prId,
      userId: user.id,
      action: "pr_rejected",
      details: { reason },
    });

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Merge PR
export async function mergePullRequest(prId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const pr = await database.query.pullRequests.findFirst({
      where: eq(pullRequests.id, prId),
    });
    if (!pr) throw new Error("Pull request not found");
    if (pr.status !== "approved") throw new Error("PR must be approved before merging");

    const targetWorkspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.targetWorkspaceId),
    });
    if (!targetWorkspace) throw new Error("Target workspace not found");

    // Check if user can merge
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, targetWorkspace.organizationId),
        eq(organizationMembers.userId, user.id)
      ),
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "reviewer")) {
      throw new Error("Only owners and reviewers can merge PRs");
    }

    // Get version contents
    const sourceVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, pr.sourceWorkspaceId),
        eq(workspaceVersions.version, pr.sourceVersion)
      ),
    });
    const targetVersion = await database.query.workspaceVersions.findFirst({
      where: and(
        eq(workspaceVersions.workspaceId, pr.targetWorkspaceId),
        eq(workspaceVersions.version, targetWorkspace.currentVersion)
      ),
    });

    // Compute diff and apply
    const diff = computeWorkflowDiff(targetVersion?.content, sourceVersion?.content);
    const mergedContent = applyDiff(
      targetVersion?.content || { nodes: [], edges: [] },
      diff
    );

    // Strip any secrets that might have slipped through
    const cleanedContent = stripSecretsFromContent(mergedContent);

    // Create new version
    const newVersion = targetWorkspace.currentVersion + 1;
    await database.insert(workspaceVersions).values({
      workspaceId: targetWorkspace.id,
      version: newVersion,
      content: cleanedContent,
      message: `Merged PR #${pr.id}: ${pr.title}`,
      createdByUserId: user.id,
    });

    // Update workspace
    await database
      .update(workspaces)
      .set({ currentVersion: newVersion, updatedAt: new Date() })
      .where(eq(workspaces.id, targetWorkspace.id));

    // Update PR
    const [updated] = await database
      .update(pullRequests)
      .set({
        status: "merged",
        mergedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pullRequests.id, prId))
      .returning();

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: targetWorkspace.organizationId,
      workspaceId: targetWorkspace.id,
      pullRequestId: prId,
      userId: user.id,
      action: "pr_merged",
      details: { newVersion },
    });

    return { success: true, data: { pr: updated, newVersion } };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Add comment to PR
export async function addPRComment(prId: string, content: string, nodeId?: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const pr = await database.query.pullRequests.findFirst({
      where: eq(pullRequests.id, prId),
    });
    if (!pr) throw new Error("Pull request not found");

    const workspace = await database.query.workspaces.findFirst({
      where: eq(workspaces.id, pr.targetWorkspaceId),
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

    const [comment] = await database
      .insert(pullRequestComments)
      .values({
        pullRequestId: prId,
        userId: user.id,
        content,
        nodeId,
      })
      .returning();

    return { success: true, data: comment };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}


