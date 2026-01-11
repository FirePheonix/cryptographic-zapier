import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Canvas } from "@/components/canvas";
import { Controls } from "@/components/controls";
import { WorkflowHeaderBar } from "@/components/workflow-header-bar";
import { currentUserProfile } from "@/lib/auth";
import { database } from "@/lib/database";
import { WorkflowProvider } from "@/providers/workflow";
import { NodeOutputsProvider } from "@/providers/node-outputs";
import { workflows } from "@/schema";

export const metadata: Metadata = {
  title: "Workflow Editor - Zynthex",
  description: "Build and edit crypto payment automation workflows",
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
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="relative flex-1">
        <NodeOutputsProvider>
          <WorkflowProvider data={workflow}>
            <Canvas>
              <Controls />
              <Suspense fallback={null}>
                <WorkflowHeaderBar id={workflowId} />
              </Suspense>
            </Canvas>
          </WorkflowProvider>
        </NodeOutputsProvider>
      </div>
    </div>
  );
};

export default WorkflowEditor;
