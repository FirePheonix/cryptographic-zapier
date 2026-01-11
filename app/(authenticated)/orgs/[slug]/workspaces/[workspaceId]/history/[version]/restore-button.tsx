"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, Loader2Icon } from "lucide-react";
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
import { restoreWorkspaceVersion } from "@/app/actions/workspace";
import { toast } from "sonner";

interface RestoreVersionButtonProps {
  workspaceId: string;
  version: number;
  slug: string;
}

export function RestoreVersionButton({ workspaceId, version, slug }: RestoreVersionButtonProps) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restoreWorkspaceVersion(workspaceId, version);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Restored to version ${version}`);
      router.push(`/orgs/${slug}/workspaces/${workspaceId}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isRestoring}>
          {isRestoring ? (
            <Loader2Icon className="size-4 mr-2 animate-spin" />
          ) : (
            <RotateCcwIcon className="size-4 mr-2" />
          )}
          Restore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore to version {version}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new version with the content from version {version}.
            Your current work will not be lost - you can always go back to any previous version.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? "Restoring..." : "Restore Version"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
