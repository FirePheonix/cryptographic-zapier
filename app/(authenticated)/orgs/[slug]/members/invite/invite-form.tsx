"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, Loader2Icon, SendIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { inviteMember, searchUsersByEmail } from "@/app/actions/organization";
import { toast } from "sonner";

interface InviteMemberFormProps {
  organizationId: string;
  slug: string;
}

export function InviteMemberForm({ organizationId, slug }: InviteMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reviewer" | "contributor">("contributor");
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [searchResult, setSearchResult] = useState<{ email: string; canInvite: boolean } | null>(null);

  async function handleSearch() {
    if (!email.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const result = await searchUsersByEmail(email.trim());
      if (result.success && result.data && result.data.length > 0) {
        setSearchResult(result.data[0]);
      } else {
        toast.error("Invalid email format");
      }
    } catch (error) {
      toast.error("Failed to search");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleInvite() {
    if (!searchResult) return;

    setIsInviting(true);
    try {
      const result = await inviteMember({
        organizationId,
        email: searchResult.email,
        role,
      });

      if (result.success) {
        toast.success(`Invitation sent to ${searchResult.email}`);
        router.push(`/orgs/${slug}`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsInviting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle>Search by Email</CardTitle>
          <CardDescription>
            Enter the email address of the person you want to invite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !email.trim()}>
              {isSearching ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SearchIcon className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
            <CardDescription>
              Configure the invitation and send it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{searchResult.email}</p>
                <p className="text-sm text-muted-foreground">
                  Will receive an invitation to join
                </p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "reviewer" | "contributor")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">
                    <div className="flex flex-col items-start">
                      <span>Contributor</span>
                      <span className="text-xs text-muted-foreground">
                        Can create and edit workspaces
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reviewer">
                    <div className="flex flex-col items-start">
                      <span>Reviewer</span>
                      <span className="text-xs text-muted-foreground">
                        Can review and approve pull requests
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Send Button */}
            <Button
              className="w-full"
              onClick={handleInvite}
              disabled={isInviting}
            >
              {isInviting ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SendIcon className="mr-2 size-4" />
              )}
              Send Invitation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground text-center">
        <p>
          The invited person will see this invitation on their Organizations page
          and can accept or decline it.
        </p>
      </div>
    </div>
  );
}
