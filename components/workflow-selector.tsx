"use client";

import Fuse from "fuse.js";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";
import { createWorkflowAction } from "@/app/actions/workflow/create";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handleError } from "@/lib/error/handle";
import { cn } from "@/lib/utils";
import type { workflows as workflowsTable } from "@/schema";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type WorkflowSelectorProps = {
  workflows: (typeof workflowsTable.$inferSelect)[];
  currentWorkflow: string;
};

export const WorkflowSelector = ({
  workflows,
  currentWorkflow,
}: WorkflowSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentWorkflow);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(workflows, {
        keys: ["name"],
        minMatchCharLength: 1,
        threshold: 0.3,
      }),
    [workflows]
  );

  const handleCreateWorkflow = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();

      if (isCreating) {
        return;
      }

      setIsCreating(true);

      try {
        const response = await createWorkflowAction(name.trim());

        if ("error" in response) {
          throw new Error(response.error);
        }

        setOpen(false);
        setCreateOpen(false);
        setName("");
        router.push(`/workflows/${response.id}`);
      } catch (error) {
        handleError("Error creating workflow", error);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, name, router]
  );

  const handleSelect = useCallback(
    (workflowId: string) => {
      if (workflowId === "new") {
        setCreateOpen(true);
        return;
      }

      setValue(workflowId);
      setOpen(false);
      router.push(`/workflows/${workflowId}`);
    },
    [router]
  );

  const filterByFuse = useCallback(
    (currentValue: string, search: string) =>
      fuse.search(search).find((result) => result.item.id === currentValue)
        ? 1
        : 0,
    [fuse]
  );

  return (
    <>
      <Combobox
        data={workflows.map((workflow) => ({
          label: workflow.name,
          value: workflow.id,
        }))}
        onOpenChange={setOpen}
        onValueChange={handleSelect}
        open={open}
        type="workflow"
        value={value}
      >
        <ComboboxTrigger className="w-52 rounded-full border-none bg-transparent shadow-none" />
        <ComboboxContent
          className="p-0"
          filter={filterByFuse}
          popoverOptions={{
            sideOffset: 8,
          }}
        >
          <ComboboxInput placeholder="Search workflows..." />
          <ComboboxList>
            <ComboboxEmpty>No workflows found.</ComboboxEmpty>
            <ComboboxGroup heading="My Workflows">
              {workflows.map((workflow) => (
                <ComboboxItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      value === workflow.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </ComboboxItem>
              ))}
            </ComboboxGroup>
            <ComboboxGroup>
              <ComboboxItem value="new">
                <PlusIcon size={16} />
                Create new workflow
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Dialog modal={false} onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new workflow</DialogTitle>
            <DialogDescription>
              What would you like to call your new automation workflow?
            </DialogDescription>
            <form
              aria-disabled={isCreating}
              className="mt-2 flex items-center gap-2"
              onSubmit={handleCreateWorkflow}
            >
              <Input
                onChange={({ target }) => setName(target.value)}
                placeholder="My new workflow"
                value={name}
              />
              <Button disabled={isCreating || !name.trim()} type="submit">
                Create
              </Button>
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};


