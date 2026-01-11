"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { workflows } from "@/schema";

type WorkflowContextType = {
  workflow: typeof workflows.$inferSelect | null;
};

export const WorkflowContext = createContext<WorkflowContextType>({
  workflow: null,
});

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);

  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }

  return context.workflow;
};

export const WorkflowProvider = ({
  children,
  data,
}: {
  children: ReactNode;
  data: typeof workflows.$inferSelect;
}) => (
  <WorkflowContext.Provider value={{ workflow: data }}>
    {children}
  </WorkflowContext.Provider>
);
