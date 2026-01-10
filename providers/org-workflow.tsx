"use client";

import { createContext, type ReactNode, useContext } from "react";

// Org workspace type (similar to workflows but for org collaboration)
export type OrgWorkspace = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  parentWorkspaceId: string | null;
  forkedFromVersion: number | null;
  forkedByUserId: string | null;
  currentVersion: number;
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
  } | null;
  createdAt: Date;
  updatedAt: Date | null;
  userRole: "owner" | "reviewer" | "contributor";
};

type OrgWorkflowContextType = {
  workspace: OrgWorkspace | null;
  slug: string;
  orgId: string;
  isFork: boolean;
  canCommitDirectly: boolean;
};

export const OrgWorkflowContext = createContext<OrgWorkflowContextType>({
  workspace: null,
  slug: "",
  orgId: "",
  isFork: false,
  canCommitDirectly: false,
});

export const useOrgWorkflow = () => {
  const context = useContext(OrgWorkflowContext);

  if (!context) {
    throw new Error("useOrgWorkflow must be used within an OrgWorkflowProvider");
  }

  return context;
};

export const OrgWorkflowProvider = ({
  children,
  workspace,
  slug,
  orgId,
}: {
  children: ReactNode;
  workspace: OrgWorkspace;
  slug: string;
  orgId: string;
}) => {
  const isFork = !!workspace.parentWorkspaceId;
  const canCommitDirectly = workspace.userRole === "owner" || workspace.userRole === "reviewer";

  return (
    <OrgWorkflowContext.Provider value={{ workspace, slug, orgId, isFork, canCommitDirectly }}>
      {children}
    </OrgWorkflowContext.Provider>
  );
};
