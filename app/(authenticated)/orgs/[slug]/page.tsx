import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  SettingsIcon,
  UsersIcon,
  FolderIcon,
  GitForkIcon,
  GitPullRequestIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getOrganization, getUserOrganizations } from "@/app/actions/organization";
import { getOrgWorkspaces } from "@/app/actions/workspace";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrgPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} - Zynthex`,
    description: `Organization ${slug}`,
  };
}

export default async function OrganizationPage({ params }: OrgPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  // Find org by slug - we need to search through user's orgs
  const orgsResult = await getUserOrganizations();
  if (!orgsResult.success || !orgsResult.data) {
    return notFound();
  }

  const org = orgsResult.data.find((o: { slug: string }) => o.slug === slug);
  if (!org) {
    return notFound();
  }

  const orgResult = await getOrganization(org.id);
  if (!orgResult.success || !orgResult.data) {
    return notFound();
  }

  const orgData = orgResult.data;
  const workspacesResult = await getOrgWorkspaces(org.id);
  const workspaces = workspacesResult.success ? workspacesResult.data : [];

  const isOwner = orgData.userRole === "owner";
  const canCreateWorkspace = isOwner || orgData.userRole === "reviewer";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <UsersIcon className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{orgData.name}</h1>
                <p className="text-sm text-muted-foreground">@{orgData.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${slug}/settings`}>
                    <SettingsIcon className="size-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
              {canCreateWorkspace && (
                <Button size="sm" asChild>
                  <Link href={`/orgs/${slug}/workspaces/new`}>
                    <PlusIcon className="size-4 mr-2" />
                    New Workspace
                  </Link>
                </Button>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <Tabs defaultValue="workspaces">
              <TabsList>
                <TabsTrigger value="workspaces">
                  <FolderIcon className="size-4 mr-2" />
                  Workspaces
                </TabsTrigger>
                <TabsTrigger value="members">
                  <UsersIcon className="size-4 mr-2" />
                  Members ({orgData.members?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workspaces" className="mt-6">
                {workspaces && workspaces.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <FolderIcon className="size-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No workspaces yet</h2>
                    <p className="text-muted-foreground mb-4">
                      Create a workspace to start building collaborative workflows
                    </p>
                    {canCreateWorkspace && (
                      <Button asChild>
                        <Link href={`/orgs/${slug}/workspaces/new`}>
                          <PlusIcon className="size-4 mr-2" />
                          Create Workspace
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {workspaces?.map((workspace) => (
                      <Link
                        key={workspace.id}
                        href={`/orgs/${slug}/workspaces/${workspace.id}`}
                        className="block p-6 rounded-lg border bg-card hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              {workspace.parentWorkspaceId ? (
                                <GitForkIcon className="size-4" />
                              ) : (
                                <FolderIcon className="size-4" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">{workspace.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                v{workspace.currentVersion}
                              </p>
                            </div>
                          </div>
                        </div>
                        {workspace.description && (
                          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                            {workspace.description}
                          </p>
                        )}
                        {workspace.parentWorkspaceId && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <GitForkIcon className="size-3" />
                            <span>Forked from v{workspace.forkedFromVersion}</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-6">
                <div className="space-y-4">
                  {isOwner && (
                    <div className="flex justify-end">
                      <Button size="sm" asChild>
                        <Link href={`/orgs/${slug}/members/invite`}>
                          <PlusIcon className="size-4 mr-2" />
                          Invite Member
                        </Link>
                      </Button>
                    </div>
                  )}
                  
                  {/* Pending Invitations */}
                  {orgData.members?.filter((m: { status: string }) => m.status === "pending").length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Pending Invitations
                      </h3>
                      <div className="border rounded-lg divide-y border-amber-200 dark:border-amber-800">
                        {orgData.members
                          ?.filter((m: { status: string }) => m.status === "pending")
                          .map((member: any) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                    {member.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.email}</p>
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Invitation pending · Will be {member.role}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
                                pending
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Active Members */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Members
                    </h3>
                    <div className="border rounded-lg divide-y">
                      {orgData.members
                        ?.filter((m: { status: string }) => m.status === "accepted")
                        .map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {member.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{member.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(member.joinedAt!).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                member.role === "owner"
                                  ? "bg-primary/10 text-primary"
                                  : member.role === "reviewer"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
