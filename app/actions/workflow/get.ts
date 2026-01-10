"use server";

import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { workflows, workflowExecutions } from "@/schema";
import { getCachedWorkflow, setCachedWorkflow } from "@/lib/redis-cache";

export const getWorkflowAction = async (
  workflowId: string
): Promise<
  | {
      workflow: typeof workflows.$inferSelect;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("You need to be logged in to view a workflow!");
    }

    // Try cache first
    let workflow = await getCachedWorkflow<typeof workflows.$inferSelect>(
      workflowId
    );

    // If not cached, fetch from database
    if (!workflow) {
      workflow = await database.query.workflows.findFirst({
        where: and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)),
      });

      // Cache for future requests
      if (workflow) {
        await setCachedWorkflow(workflowId, workflow);
      }
    } else {
      // Verify ownership even with cached data
      if (workflow.userId !== user.id) {
        throw new Error("Workflow not found");
      }
    }

    if (!workflow) {
      return { workflow: null };
    }

    return { workflow };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};

export const listWorkflowsAction = async (): Promise<
  | {
      workflows: Array<typeof workflows.$inferSelect>;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("You need to be logged in to list workflows!");
    }

    const userWorkflows = await database.query.workflows.findMany({
      where: eq(workflows.userId, user.id),
      orderBy: (workflows, { desc }) => [desc(workflows.createdAt)],
    });

    return { workflows: userWorkflows };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};

export const getWorkflowExecutionsAction = async (
  workflowId: string
): Promise<
  | {
      executions: Array<typeof workflowExecutions.$inferSelect>;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("You need to be logged in to view executions!");
    }

    // Verify workflow ownership
    const workflow = await database.query.workflows.findFirst({
      where: and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)),
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const executions = await database.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.workflowId, workflowId),
      orderBy: (executions, { desc }) => [desc(executions.startedAt)],
      limit: 50,
    });

    return { executions };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};


