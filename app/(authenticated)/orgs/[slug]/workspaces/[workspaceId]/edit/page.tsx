import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace } from "@/app/actions/workspace";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { OrgCanvas } from "@/components/org-canvas";
import { Controls } from "@/components/controls";
import { OrgSaveIndicator } from "@/components/org-save-indicator";
import { OrgGitControls } from "@/components/org-git-controls";
import { OrgWorkflowProvider } from "@/providers/org-workflow";
import { NodeOutputsProvider } from "@/providers/node-outputs";

interface WorkspaceEditPageProps {
  params: Promise<{ slug: string; workspaceId: string }>;
}

export async function generateMetadata({ params }: WorkspaceEditPageProps): Promise<Metadata> {
  return {
    title: "Edit Workspace - Zynthex",
    description: "Edit your collaborative workflow",
  };
}

export const maxDuration = 60;

export default async function WorkspaceEditPage({ params }: WorkspaceEditPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  // Get org to verify access
  const orgResult = await getOrganizationBySlug(slug);
  if (!orgResult.success || !orgResult.data) {
    return notFound();
  }

  const workspaceResult = await getWorkspace(workspaceId);
  if (!workspaceResult.success || !workspaceResult.data) {
    return notFound();
  }

  const workspace = workspaceResult.data;
  const isFork = !!workspace.parentWorkspaceId;
  const canEdit = workspace.userRole === "owner" || workspace.userRole === "reviewer" || isFork;

  if (!canEdit) {
    return redirect(`/orgs/${slug}/workspaces/${workspaceId}`);
  }

  // Transform workspace data for the provider
  const workspaceData = {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    organizationId: workspace.organizationId,
    parentWorkspaceId: workspace.parentWorkspaceId,
    forkedFromVersion: workspace.forkedFromVersion,
    forkedByUserId: workspace.forkedByUserId,
    currentVersion: workspace.currentVersion,
    content: workspace.content as {
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
    } | null,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    userRole: workspace.userRole as "owner" | "reviewer" | "contributor",
  };

  return (
    <div className="flex h-screen w-screen items-stretch overflow-hidden">
      <div className="relative flex-1">
        <NodeOutputsProvider>
          <OrgWorkflowProvider workspace={workspaceData} slug={slug} orgId={orgResult.data.id}>
            <OrgCanvas>
              <Controls />
              <OrgSaveIndicator />
            </OrgCanvas>
          </OrgWorkflowProvider>
        </NodeOutputsProvider>
        <OrgWorkflowProvider workspace={workspaceData} slug={slug} orgId={orgResult.data.id}>
          <OrgGitControls />
        </OrgWorkflowProvider>
      </div>
    </div>
  );
}
