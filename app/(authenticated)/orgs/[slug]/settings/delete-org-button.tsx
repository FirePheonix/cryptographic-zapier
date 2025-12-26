"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOrganization } from "@/app/actions/organization";
import { toast } from "sonner";

interface DeleteOrgButtonProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgButton({ orgId, orgName }: DeleteOrgButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const canDelete = confirmText === orgName;

  async function handleDelete() {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteOrganization(orgId);
      if (result.success) {
        toast.success("Organization deleted successfully");
        router.push("/orgs");
      } else {
        toast.error(result.error || "Failed to delete organization");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2Icon className="size-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the{" "}
            <span className="font-semibold text-foreground">{orgName}</span>{" "}
            organization and all of its workspaces, pull requests, and data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="confirm">
            Type <span className="font-semibold">{orgName}</span> to confirm
          </Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={orgName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2Icon className="size-4 mr-2 animate-spin" />}
            Delete Organization
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
