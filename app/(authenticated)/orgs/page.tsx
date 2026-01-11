import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusIcon, UsersIcon, FolderIcon, MailIcon } from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getUserOrganizations, getPendingInvitations } from "@/app/actions/organization";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PendingInvitations } from "./pending-invitations";

export const metadata: Metadata = {
  title: "Organizations - zynthex",
  description: "Manage your organizations and team collaboration",
};

export default async function OrganizationsPage() {
  const profile = await currentUserProfile();
  const user = await currentUser();

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  if (!profile.onboardedAt) {
    return redirect("/welcome");
  }

  const [orgsResult, invitesResult] = await Promise.all([
    getUserOrganizations(),
    getPendingInvitations(),
  ]);
  
  const organizations = orgsResult.success ? orgsResult.data : [];
  const pendingInvitations = invitesResult.success ? invitesResult.data : [];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <UsersIcon className="size-5 text-primary" />
              <h1 className="text-lg font-semibold">Organizations</h1>
            </div>
            <Button asChild>
              <Link href="/orgs/new">
                <PlusIcon className="size-4 mr-2" />
                New Organization
              </Link>
            </Button>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Pending Invitations */}
            {pendingInvitations && pendingInvitations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MailIcon className="size-4" />
                  Pending Invitations ({pendingInvitations.length})
                </h2>
                <PendingInvitations invitations={pendingInvitations} />
              </div>
            )}

            {/* Organizations */}
            {organizations && organizations.length === 0 && (!pendingInvitations || pendingInvitations.length === 0) ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <UsersIcon className="size-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No organizations yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create an organization to collaborate with your team
                </p>
                <Button asChild>
                  <Link href="/orgs/new">
                    <PlusIcon className="size-4 mr-2" />
                    Create Organization
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations?.map((org) => (
                  <Link
                    key={org.id}
                    href={`/orgs/${org.slug}`}
                    className="block p-6 rounded-lg border bg-card hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <UsersIcon className="size-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            @{org.slug}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          org.role === "owner"
                            ? "bg-primary/10 text-primary"
                            : org.role === "reviewer"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {org.role}
                      </span>
                    </div>
                    {org.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {org.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FolderIcon className="size-3" />
                        Workspaces
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


