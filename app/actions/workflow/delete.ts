"use server";

import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { workflows } from "@/schema";
import { invalidateWorkflowCache } from "@/lib/redis-cache";

export const deleteWorkflowAction = async (
  workflowId: string
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
      throw new Error("You need to be logged in to delete a workflow!");
    }

    await database
      .delete(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)));

    // Invalidate cache when workflow is deleted
    await invalidateWorkflowCache(workflowId);

    return { success: true };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};


