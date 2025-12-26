import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Canvas } from "@/components/canvas";
import { Controls } from "@/components/controls";
import { SaveIndicator } from "@/components/save-indicator";
import { Toolbar } from "@/components/toolbar";
import { BlockchainToolbar } from "@/components/blockchain-toolbar";
import { WorkflowTopLeft } from "@/components/workflow-top-left";
import { WorkflowTopRight } from "@/components/workflow-top-right";
import { WorkflowExecutionControls } from "@/components/workflow-execution";
import { currentUserProfile } from "@/lib/auth";
import { database } from "@/lib/database";
import { WorkflowProvider } from "@/providers/workflow";
import { NodeOutputsProvider } from "@/providers/node-outputs";
import { workflows } from "@/schema";

export const metadata: Metadata = {
  title: "Workflow Editor - Veriflow",
  description: "Build and edit automation workflows",
};

export const maxDuration = 60;

type WorkflowEditorProps = {
  params: Promise<{
    workflowId: string;
  }>;
};

const WorkflowEditor = async ({ params }: WorkflowEditorProps) => {
  const { workflowId } = await params;
  const profile = await currentUserProfile();

  if (!profile) {
    return redirect("/auth/login");
  }

  if (!profile.onboardedAt) {
    return redirect("/welcome");
  }

  const workflow = await database.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });

  if (!workflow) {
    notFound();
  }

  return (
    <div className="flex h-screen w-screen items-stretch overflow-hidden">
      <div className="relative flex-1">
        <NodeOutputsProvider>
          <WorkflowProvider data={workflow}>
            <Canvas>
              <Controls />
              <Toolbar />
              <BlockchainToolbar />
              <SaveIndicator />
              <WorkflowExecutionControls workflowId={workflowId} />
            </Canvas>
          </WorkflowProvider>
        </NodeOutputsProvider>
        <Suspense fallback={null}>
          <WorkflowTopLeft id={workflowId} />
        </Suspense>
        <Suspense fallback={null}>
          <WorkflowTopRight id={workflowId} />
        </Suspense>
      </div>
    </div>
  );
};

export default WorkflowEditor;
