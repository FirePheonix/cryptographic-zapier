import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  GitForkIcon,
  GitPullRequestIcon,
  HistoryIcon,
  SettingsIcon,
  PlayIcon,
  AlertCircleIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace, getWorkspaceHistory } from "@/app/actions/workspace";
import { getWorkspacePRs } from "@/app/actions/pull-request";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WorkspaceActions } from "./workspace-actions";

interface WorkspacePageProps {
  params: Promise<{ slug: string; workspaceId: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  return {
    title: "Workspace - Zynthex",
    description: "Collaborative workspace",
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  const workspaceResult = await getWorkspace(workspaceId);
  if (!workspaceResult.success || !workspaceResult.data) {
    return notFound();
  }

  const workspace = workspaceResult.data;
  const historyResult = await getWorkspaceHistory(workspaceId);
  const history = historyResult.success ? historyResult.data : [];

  // Get PRs if this is a main workspace (not a fork)
  let pullRequests: Awaited<ReturnType<typeof getWorkspacePRs>>["data"] = [];
  if (!workspace.parentWorkspaceId) {
    const prsResult = await getWorkspacePRs(workspaceId);
    pullRequests = prsResult.success ? prsResult.data : [];
  }

  // Check for unbound secrets
  const unboundSecrets = workspace.secrets?.filter((s) => !s.isBound) || [];
  const hasUnboundSecrets = unboundSecrets.length > 0;

  const isFork = !!workspace.parentWorkspaceId;
  const userRole = workspace.userRole;
  // Owners and reviewers can edit main workspace directly, everyone can edit their own fork
  const canEditDirectly = userRole === "owner" || userRole === "reviewer";
  const canEdit = canEditDirectly || isFork;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${slug}`}>
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                {isFork && <GitForkIcon className="size-4 text-muted-foreground" />}
                <h1 className="text-lg font-semibold">{workspace.name}</h1>
                <Badge variant="outline">v{workspace.currentVersion}</Badge>
              </div>
            </div>
            <WorkspaceActions
              workspace={workspace}
              slug={slug}
              isFork={isFork}
              canEdit={canEdit}
              userRole={userRole}
            />
          </header>

          {/* Unbound secrets warning */}
          {hasUnboundSecrets && (
            <div className="mx-6 mt-4 p-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700">
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="size-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Unbound Credentials
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This workspace has {unboundSecrets.length} credential
                    {unboundSecrets.length !== 1 ? "s" : ""} that need to be connected:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {unboundSecrets.map((secret) => (
                      <li
                        key={secret.credentialRef}
                        className="text-sm text-yellow-700 dark:text-yellow-300"
                      >
                        • {secret.name} ({secret.provider})
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href={`/orgs/${slug}/workspaces/${workspaceId}/secrets`}>
                      Connect Credentials
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <Tabs defaultValue="editor">
              <TabsList>
                <TabsTrigger value="editor">
                  <PlayIcon className="size-4 mr-2" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="history">
                  <HistoryIcon className="size-4 mr-2" />
                  History ({history?.length || 0})
                </TabsTrigger>
                {!isFork && (
                  <TabsTrigger value="prs">
                    <GitPullRequestIcon className="size-4 mr-2" />
                    Pull Requests ({pullRequests?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="editor" className="mt-6">
                <div className="border rounded-lg p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Workflow editor will be embedded here
                  </p>
                  <Button asChild>
                    <Link href={`/orgs/${slug}/workspaces/${workspaceId}/edit`}>
                      Open Full Editor
                    </Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                {history && history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No version history yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history?.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">v{version.version}</Badge>
                          <div>
                            <p className="font-medium">
                              {version.message || `Version ${version.version}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(version.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {!isFork && (
                <TabsContent value="prs" className="mt-6">
                  {pullRequests && pullRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pull requests yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pullRequests?.map((pr) => (
                        <Link
                          key={pr.id}
                          href={`/orgs/${slug}/workspaces/${workspaceId}/pr/${pr.id}`}
                          className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <GitPullRequestIcon
                              className={`size-5 ${
                                pr.status === "open"
                                  ? "text-green-600"
                                  : pr.status === "merged"
                                  ? "text-purple-600"
                                  : pr.status === "approved"
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }`}
                            />
                            <div>
                              <p className="font-medium">{pr.title}</p>
                              <p className="text-xs text-muted-foreground">
                                v{pr.sourceVersion} → v{pr.targetVersion} •{" "}
                                {new Date(pr.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              pr.status === "open"
                                ? "default"
                                : pr.status === "merged"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {pr.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
