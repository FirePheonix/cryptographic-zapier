"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, XIcon, Loader2Icon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitation, rejectInvitation } from "@/app/actions/organization";
import { toast } from "sonner";

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedAt: Date;
  organization?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  };
}

interface PendingInvitationsProps {
  invitations: Invitation[];
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
  const router = useRouter();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  async function handleAccept(invitationId: string) {
    setLoadingIds((prev) => new Set(prev).add(invitationId));
    try {
      const result = await acceptInvitation(invitationId);
      if (result.success) {
        toast.success("You've joined the organization!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to accept invitation");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  }

  async function handleReject(invitationId: string) {
    setLoadingIds((prev) => new Set(prev).add(invitationId));
    try {
      const result = await rejectInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation declined");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to decline invitation");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      {invitations.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <UsersIcon className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium">
                {invite.organization?.name || "Unknown Organization"}
              </p>
              <p className="text-sm text-muted-foreground">
                Invited as <span className="font-medium">{invite.role}</span>
                {invite.organization?.slug && (
                  <> · @{invite.organization.slug}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => handleReject(invite.id)}
              disabled={loadingIds.has(invite.id)}
            >
              {loadingIds.has(invite.id) ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  <XIcon className="size-4 mr-1" />
                  Decline
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(invite.id)}
              disabled={loadingIds.has(invite.id)}
            >
              {loadingIds.has(invite.id) ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  <CheckIcon className="size-4 mr-1" />
                  Accept
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}


