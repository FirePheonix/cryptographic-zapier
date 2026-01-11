/**
 * Drag Context Provider
 * 
 * Manages drag state for transferring data from Input/Output panels
 * to Configuration panel inputs
 */

"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DragData {
  path: string;       // e.g., "input.amount" or "transactions[0].signature"
  value: any;         // The actual value for preview
  sourceNodeId?: string;
  sourceNodeName?: string;
}

interface DragContextType {
  dragData: DragData | null;
  isDragging: boolean;
  startDrag: (data: DragData) => void;
  endDrag: () => void;
}

const DragContext = createContext<DragContextType | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragData, setDragData] = useState<DragData | null>(null);

  const startDrag = (data: DragData) => {
    setDragData(data);
  };

  const endDrag = () => {
    setDragData(null);
  };

  return (
    <DragContext.Provider
      value={{
        dragData,
        isDragging: dragData !== null,
        startDrag,
        endDrag,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }
  return context;
}


