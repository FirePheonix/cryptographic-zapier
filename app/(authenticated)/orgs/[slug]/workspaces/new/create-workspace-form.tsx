"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { initializeWorkspaceOnChain } from "@/lib/solana/blockchain-actions";

interface CreateWorkspaceFormProps {
  organizationId: string;
  slug: string;
}

export function CreateWorkspaceForm({ organizationId, slug }: CreateWorkspaceFormProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating || !name.trim()) return;

    setIsCreating(true);
    try {
      // Step 1: Create in database first to get workspace ID
      const result = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        organizationId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create workspace");
        return;
      }

      // Step 2: Initialize workspace on blockchain (Phantom will open)
      await initializeWorkspaceOnChain(slug, result.data!.id, name.trim());

      toast.success("Workspace created successfully!");
      router.push(`/orgs/${slug}/workspaces/${result.data?.id}`);
    } catch (error) {
      toast.error("An error occurred while creating workspace");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workflow Project"
          required
          disabled={isCreating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What workflows will this workspace contain?"
          rows={3}
          disabled={isCreating}
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isCreating || !name.trim()}
        >
          {isCreating && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          {isCreating ? "Creating..." : "Create Workspace"}
        </Button>
      </div>
    </form>
  );
}
