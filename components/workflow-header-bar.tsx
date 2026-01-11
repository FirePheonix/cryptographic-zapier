import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows } from "@/schema";
import { WorkflowSelector } from "./workflow-selector";
import { WorkflowSettings } from "./workflow-settings";
import { Menu } from "./menu";
import { WorkflowHeaderClient } from "./workflow-header";

type WorkflowHeaderBarProps = {
  id: string;
};

export const WorkflowHeaderBar = async ({ id }: WorkflowHeaderBarProps) => {
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
    <WorkflowHeaderClient
      workflowId={id}
      workflowSelector={
        <WorkflowSelector
          currentWorkflow={currentWorkflow.id}
          workflows={allWorkflows}
        />
      }
      workflowSettings={<WorkflowSettings data={currentWorkflow} />}
      menu={<Menu />}
    />
  );
};
