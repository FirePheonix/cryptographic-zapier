"use server";

import { eq, and } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { organizations, organizationMembers, auditLogs } from "@/schema";

// Types
export type OrgRole = "owner" | "reviewer" | "contributor";
export type MemberStatus = "pending" | "accepted" | "rejected";

export interface CreateOrgInput {
  name: string;
  slug: string;
  description?: string;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: OrgRole;
}

// Create organization
export async function createOrganization(input: CreateOrgInput) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check if slug is available
    const existing = await database.query.organizations.findFirst({
      where: eq(organizations.slug, input.slug),
    });
    if (existing) throw new Error("Organization slug already taken");

    const [org] = await database
      .insert(organizations)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        ownerId: user.id,
      })
      .returning();

    // Add owner as member (already accepted)
    await database.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      email: user.email || "",
      role: "owner",
      status: "accepted",
      joinedAt: new Date(),
    });

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: org.id,
      userId: user.id,
      action: "org_created",
      details: { name: input.name, slug: input.slug },
    });

    return { success: true, data: org };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get user's organizations (only accepted memberships)
export async function getUserOrganizations() {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const memberships = await database.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });

    const orgIds = memberships.map((m) => m.organizationId);
    
    if (orgIds.length === 0) return { success: true, data: [] };

    const orgs = await database.query.organizations.findMany({
      where: (organizations, { inArray }) => inArray(organizations.id, orgIds),
    });

    // Attach role to each org
    const orgsWithRole = orgs.map((org) => ({
      ...org,
      role: memberships.find((m) => m.organizationId === org.id)?.role || "contributor",
    }));

    return { success: true, data: orgsWithRole };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get pending invitations for current user
export async function getPendingInvitations() {
  try {
    const user = await currentUser();
    if (!user || !user.email) throw new Error("Unauthorized");

    // Find pending invitations by email
    const pendingInvites = await database.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.email, user.email),
        eq(organizationMembers.status, "pending")
      ),
    });

    if (pendingInvites.length === 0) {
      return { success: true, data: [] };
    }

    // Get org details for each invitation
    const orgIds = pendingInvites.map((i) => i.organizationId);
    const orgs = await database.query.organizations.findMany({
      where: (organizations, { inArray }) => inArray(organizations.id, orgIds),
    });

    const invitationsWithOrg = pendingInvites.map((invite) => ({
      ...invite,
      organization: orgs.find((o) => o.id === invite.organizationId),
    }));

    return { success: true, data: invitationsWithOrg };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Accept invitation
export async function acceptInvitation(invitationId: string) {
  try {
    const user = await currentUser();
    if (!user || !user.email) throw new Error("Unauthorized");

    // Find the invitation
    const invitation = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, invitationId),
        eq(organizationMembers.email, user.email),
        eq(organizationMembers.status, "pending")
      ),
    });

    if (!invitation) throw new Error("Invitation not found");

    // Update the invitation to accepted
    const [updated] = await database
      .update(organizationMembers)
      .set({
        status: "accepted",
        userId: user.id,
        joinedAt: new Date(),
      })
      .where(eq(organizationMembers.id, invitationId))
      .returning();

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: invitation.organizationId,
      userId: user.id,
      action: "org_member_invited",
      details: { action: "accepted", email: user.email },
    });

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Reject invitation
export async function rejectInvitation(invitationId: string) {
  try {
    const user = await currentUser();
    if (!user || !user.email) throw new Error("Unauthorized");

    // Find the invitation
    const invitation = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, invitationId),
        eq(organizationMembers.email, user.email),
        eq(organizationMembers.status, "pending")
      ),
    });

    if (!invitation) throw new Error("Invitation not found");

    // Delete the invitation
    await database
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, invitationId));

    return { success: true };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get single organization with members
export async function getOrganization(orgId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check membership (must be accepted)
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    const org = await database.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });
    if (!org) throw new Error("Organization not found");

    const members = await database.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, orgId),
    });

    return { 
      success: true, 
      data: { 
        ...org, 
        members,
        userRole: membership.role,
      } 
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Get organization by slug
export async function getOrganizationBySlug(slug: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const org = await database.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });
    if (!org) throw new Error("Organization not found");

    // Check membership (must be accepted)
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership) throw new Error("Not a member of this organization");

    const members = await database.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, org.id),
    });

    return { 
      success: true, 
      data: { 
        ...org, 
        members,
        userRole: membership.role,
      } 
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Search users by email (for inviting)
export async function searchUsersByEmail(email: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: true, data: [] };
    }

    // Return the email as a valid invite target
    return { 
      success: true, 
      data: [{ email, canInvite: true }] 
    };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Invite member to organization (by email)
export async function inviteMember(input: InviteMemberInput) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is owner or has invite permissions
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership || membership.role !== "owner") {
      throw new Error("Only owners can invite members");
    }

    // Check if already invited or member
    const existing = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.email, input.email)
      ),
    });
    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("User is already a member");
      }
      if (existing.status === "pending") {
        throw new Error("User already has a pending invitation");
      }
    }

    // Create pending invitation
    const [member] = await database
      .insert(organizationMembers)
      .values({
        organizationId: input.organizationId,
        userId: "", // Will be filled when user accepts
        email: input.email,
        role: input.role,
        status: "pending",
      })
      .returning();

    // Audit log
    await database.insert(auditLogs).values({
      organizationId: input.organizationId,
      userId: user.id,
      action: "org_member_invited",
      details: { email: input.email, role: input.role },
    });

    return { success: true, data: member };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Update member role
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: OrgRole
) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is owner
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership || membership.role !== "owner") {
      throw new Error("Only owners can update member roles");
    }

    // Cannot change owner's role
    const targetMember = await database.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, memberId),
    });
    if (!targetMember) throw new Error("Member not found");
    
    const org = await database.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    if (targetMember.userId === org?.ownerId) {
      throw new Error("Cannot change owner's role");
    }

    const [updated] = await database
      .update(organizationMembers)
      .set({ role: newRole })
      .where(eq(organizationMembers.id, memberId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Remove member from organization
export async function removeMember(organizationId: string, memberId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is owner
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership || membership.role !== "owner") {
      throw new Error("Only owners can remove members");
    }

    const targetMember = await database.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, memberId),
    });
    if (!targetMember) throw new Error("Member not found");

    // Cannot remove owner
    const org = await database.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    if (targetMember.userId === org?.ownerId) {
      throw new Error("Cannot remove the organization owner");
    }

    await database
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, memberId));

    // Audit log
    await database.insert(auditLogs).values({
      organizationId,
      userId: user.id,
      action: "org_member_removed",
      details: { removedUserId: targetMember.userId, email: targetMember.email },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Cancel pending invitation (by owner)
export async function cancelInvitation(organizationId: string, invitationId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is owner
    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });
    if (!membership || membership.role !== "owner") {
      throw new Error("Only owners can cancel invitations");
    }

    const invitation = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, invitationId),
        eq(organizationMembers.status, "pending")
      ),
    });
    if (!invitation) throw new Error("Invitation not found");

    await database
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, invitationId));

    return { success: true };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

// Check user's role in organization
export async function checkOrgRole(organizationId: string): Promise<OrgRole | null> {
  try {
    const user = await currentUser();
    if (!user) return null;

    const membership = await database.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "accepted")
      ),
    });

    return membership?.role || null;
  } catch {
    return null;
  }
}

// Delete organization (owner only)
export async function deleteOrganization(organizationId: string) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // Verify user is the owner
    const org = await database.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== user.id) throw new Error("Only the owner can delete an organization");

    // Delete all members first (foreign key constraint)
    await database
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));

    // Delete audit logs
    await database
      .delete(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId));

    // Delete the organization
    await database
      .delete(organizations)
      .where(eq(organizations.id, organizationId));

    return { success: true };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}
