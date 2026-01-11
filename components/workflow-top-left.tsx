import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows } from "@/schema";
import { WorkflowSelector } from "./workflow-selector";
import { WorkflowSettings } from "./workflow-settings";

type WorkflowTopLeftProps = {
  id: string;
};

export const WorkflowTopLeft = async ({ id }: WorkflowTopLeftProps) => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const allWorkflows = await database.query.workflows.findMany({
    where: eq(workflows.userId, user.id),
    orderBy: (workflows, { desc }) => [desc(workflows.createdAt)],
  });

  if (!allWorkflows.length) {
    return null;
  }

  const currentWorkflow = allWorkflows.find((workflow) => workflow.id === id);

  if (!currentWorkflow) {
    return null;
  }

  return (
    <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:right-auto">
      <div className="flex flex-1 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <WorkflowSelector
          currentWorkflow={currentWorkflow.id}
          workflows={allWorkflows}
        />
      </div>
      <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <WorkflowSettings data={currentWorkflow} />
      </div>
    </div>
  );
};


