"use server";

import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import { getTemplateById } from "@/lib/templates";
import { workflows } from "@/schema";

export const createWorkflowFromTemplateAction = async (
  templateId: string,
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

    const template = getTemplateById(templateId);

    if (!template) {
      throw new Error("Template not found!");
    }

    const [workflow] = await database
      .insert(workflows)
      .values({
        name,
        userId: user.id,
        description: template.description,
        content: template.content,
      })
      .returning({ id: workflows.id });

    return { id: workflow.id };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};
