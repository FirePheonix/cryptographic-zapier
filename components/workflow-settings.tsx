"use client";

import { CopyIcon, HistoryIcon, PlayIcon, SettingsIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEventHandler, useState } from "react";
import { toast } from "sonner";
import { deleteWorkflowAction } from "@/app/actions/workflow/delete";
import { updateWorkflowAction } from "@/app/actions/workflow/update";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { handleError } from "@/lib/error/handle";
import type { workflows } from "@/schema";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type WorkflowSettingsProps = {
  data: typeof workflows.$inferSelect;
};

export const WorkflowSettings = ({ data }: WorkflowSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description || "");
  const [enabled, setEnabled] = useState(data.enabled);
  const router = useRouter();

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/trigger/${data.id}`
      : "";

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const handleUpdateWorkflow: FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();

    if (isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);

      const response = await updateWorkflowAction(data.id, {
        name,
        description: description || null,
        enabled,
      });

      if ("error" in response) {
        throw new Error(response.error);
      }

      toast.success("Workflow updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      handleError("Error updating workflow", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    try {
      const response = await deleteWorkflowAction(data.id);

      if ("error" in response) {
        throw new Error(response.error);
      }

      toast.success("Workflow deleted successfully");
      setOpen(false);
      router.push("/workflows");
    } catch (error) {
      handleError("Error deleting workflow", error);
    }
  };

  const handleTestWorkflow = async () => {
    try {
      const response = await fetch(`/api/trigger/${data.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: true,
          message: "Test trigger from workflow settings",
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Workflow executed successfully!");
      } else {
        toast.error(`Workflow failed: ${result.error}`);
      }
    } catch (error) {
      handleError("Error testing workflow", error);
    }
  };

  return (
    <Dialog modal={false} onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="rounded-full" size="icon" variant="ghost">
          <SettingsIcon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
          <DialogDescription>
            Configure your automation workflow.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-disabled={isUpdating}
          className="mt-2 grid gap-4"
          onSubmit={handleUpdateWorkflow}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={({ target }) => setName(target.value)}
              placeholder="My workflow"
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              onChange={({ target }) => setDescription(target.value)}
              placeholder="What does this workflow do?"
              value={description}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="enabled">Workflow Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Disabled workflows won't respond to webhook triggers
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyWebhook}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send a POST request with JSON body to trigger this workflow
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleTestWorkflow}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/workflows/${data.id}/executions`}>
                <HistoryIcon className="h-4 w-4 mr-2" />
                History
              </Link>
            </Button>
          </div>

          <Button disabled={isUpdating || !name.trim()} type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
        <DialogFooter className="-mx-6 mt-4 border-t px-6 pt-4 sm:justify-center">
          <Button
            className="flex items-center gap-2 text-destructive"
            onClick={handleDeleteWorkflow}
            variant="link"
          >
            <TrashIcon size={16} />
            <span>Delete Workflow</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


