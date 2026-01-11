/**
 * Droppable Input
 * 
 * Input/Textarea component that accepts dropped schema items
 * and shows variable references with special styling
 */

"use client";

import { useState, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useDrag } from "./drag-context";

interface DroppableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

interface DroppableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const DroppableInput = forwardRef<HTMLInputElement, DroppableInputProps>(
  ({ className, onValueChange, onChange, value, ...props }, ref) => {
    const [isOver, setIsOver] = useState(false);
    const { isDragging, dragData, endDrag } = useDrag();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsOver(true);
    };

    const handleDragLeave = () => {
      setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      
      const droppedText = e.dataTransfer.getData("text/plain");
      if (droppedText && onValueChange) {
        const currentValue = String(value || "");
        const input = inputRef.current;
        
        if (input) {
          const start = input.selectionStart || currentValue.length;
          const end = input.selectionEnd || currentValue.length;
          const newValue = currentValue.slice(0, start) + droppedText + currentValue.slice(end);
          onValueChange(newValue);
        } else {
          onValueChange(currentValue + droppedText);
        }
      }
      
      endDrag();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      } else if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="relative">
        <input
          ref={(node) => {
            (inputRef as any).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isDragging && "border-dashed border-primary/50",
            isOver && "border-primary bg-primary/5 ring-2 ring-primary/20",
            className
          )}
          value={value}
          onChange={handleChange}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          {...props}
        />
        {isOver && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-primary/5 rounded-md border-2 border-dashed border-primary">
            <span className="text-xs text-primary font-medium">Drop here</span>
          </div>
        )}
      </div>
    );
  }
);
DroppableInput.displayName = "DroppableInput";

export const DroppableTextarea = forwardRef<HTMLTextAreaElement, DroppableTextareaProps>(
  ({ className, onValueChange, onChange, value, ...props }, ref) => {
    const [isOver, setIsOver] = useState(false);
    const { isDragging, dragData, endDrag } = useDrag();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsOver(true);
    };

    const handleDragLeave = () => {
      setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      
      const droppedText = e.dataTransfer.getData("text/plain");
      if (droppedText && onValueChange) {
        const currentValue = String(value || "");
        const textarea = textareaRef.current;
        
        if (textarea) {
          const start = textarea.selectionStart || currentValue.length;
          const end = textarea.selectionEnd || currentValue.length;
          const newValue = currentValue.slice(0, start) + droppedText + currentValue.slice(end);
          onValueChange(newValue);
          
          // Set cursor position after the inserted text
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + droppedText.length;
            textarea.focus();
          }, 0);
        } else {
          onValueChange(currentValue + droppedText);
        }
      }
      
      endDrag();
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      } else if (onChange) {
        onChange(e);
      }
    };

    // Render value with highlighted variables
    const renderValueWithHighlights = () => {
      const strValue = String(value || "");
      const regex = /\{\{[^}]+\}\}/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(strValue)) !== null) {
        if (match.index > lastIndex) {
          parts.push(strValue.slice(lastIndex, match.index));
        }
        parts.push(
          <span key={match.index} className="text-emerald-500 font-medium">
            {match[0]}
          </span>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < strValue.length) {
        parts.push(strValue.slice(lastIndex));
      }

      return parts;
    };

    return (
      <div className="relative">
        <textarea
          ref={(node) => {
            (textareaRef as any).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isDragging && "border-dashed border-primary/50",
            isOver && "border-primary bg-primary/5 ring-2 ring-primary/20",
            className
          )}
          value={value}
          onChange={handleChange}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          {...props}
        />
        {isOver && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-primary/5 rounded-md border-2 border-dashed border-primary">
            <span className="text-xs text-primary font-medium">Drop variable here</span>
          </div>
        )}
      </div>
    );
  }
);
DroppableTextarea.displayName = "DroppableTextarea";

/**
 * Component to display text with highlighted variable references
 */
export function VariableHighlight({ text }: { text: string }) {
  const regex = /\{\{[^}]+\}\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <span
        key={`var-${match.index}`}
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-mono text-xs"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}


