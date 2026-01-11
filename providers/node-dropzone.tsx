"use client";

import type { ReactNode } from "react";

type NodeDropzoneProviderProps = {
  children: ReactNode;
};

// Simplified provider - file drop functionality removed for workflow app
export const NodeDropzoneProvider = ({
  children,
}: NodeDropzoneProviderProps) => {
  return <>{children}</>;
};
