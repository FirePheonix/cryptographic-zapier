"use client";

import { InfoIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkflowFromTemplateAction } from "@/app/actions/workflow/create-from-template";
import { handleError } from "@/lib/error/handle";

// Map of icon names to their image paths
const iconMap: Record<string, string> = {
  gmail: "/icons/gmail.svg",
  sheets: "/icons/sheets.svg",
  openai: "/icons/openai.svg",
  drive: "/icons/drive.svg",
};

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    icons: string[];
    additionalCount?: number;
  };
}

export function TemplateCard({ template }: TemplateCardProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template.name);
  const [isCreating, setIsCreating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const router = useRouter();

  const handleUseTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreating || !name.trim()) return;

    setIsCreating(true);
    try {
      const response = await createWorkflowFromTemplateAction(
        template.id,
        name.trim()
      );

      if ("error" in response) {
        throw new Error(response.error);
      }

      setOpen(false);
      setName(template.name);
      router.push(`/workflows/${response.id}`);
    } catch (error) {
      handleError("Error creating workflow from template", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors">
        {/* Icons */}
        <div className="flex items-center gap-2">
          {template.icons.map((icon) => (
            <div
              key={icon}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted"
            >
              {iconMap[icon] ? (
                <Image
                  src={iconMap[icon]}
                  alt={icon}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              ) : (
                <span className="text-xs font-medium uppercase">{icon[0]}</span>
              )}
            </div>
          ))}
          {template.additionalCount && template.additionalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              +{template.additionalCount}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-medium leading-tight line-clamp-2">
          {template.name}
        </h3>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <Button size="sm" className="flex-shrink-0" onClick={() => setOpen(true)}>
            Use Template
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={() => setShowInfo(true)}
          >
            <InfoIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workflow from template</DialogTitle>
            <DialogDescription>
              Enter a name for your new workflow. You can customize it after
              creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUseTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow name</Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workflow name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !name.trim()}>
                {isCreating ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>{template.description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Includes:</span>
            {template.icons.map((icon) => (
              <div
                key={icon}
                className="flex items-center justify-center w-6 h-6 rounded bg-muted"
              >
                {iconMap[icon] ? (
                  <Image
                    src={iconMap[icon]}
                    alt={icon}
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-xs font-medium uppercase">
                    {icon[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowInfo(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowInfo(false);
                setOpen(true);
              }}
            >
              Use Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
