"use server";

import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { workflows } from "@/schema";
import { invalidateWorkflowCache } from "@/lib/redis-cache";

export const updateWorkflowAction = async (
  workflowId: string,
  data: Partial<typeof workflows.$inferInsert>
): Promise<
  | {
      success: true;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("You need to be logged in to update a workflow!");
    }

    const result = await database
      .update(workflows)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)));

    if (!result) {
      throw new Error("Workflow not found");
    }

    // Invalidate cache when workflow is updated
    await invalidateWorkflowCache(workflowId);

    return { success: true };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};


