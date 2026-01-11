"use server";

import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { workflows } from "@/schema";

export const createWorkflowAction = async (
  name: string
): Promise<
  | {
      id: string;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("You need to be logged in to create a workflow!");
    }

    const [workflow] = await database
      .insert(workflows)
      .values({
        name,
        userId: user.id,
        content: {
          nodes: [],
          edges: [],
        },
      })
      .returning({ id: workflows.id });

    return { id: workflow.id };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};


