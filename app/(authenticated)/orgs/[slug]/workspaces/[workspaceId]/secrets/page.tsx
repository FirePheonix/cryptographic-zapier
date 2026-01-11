import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  KeyIcon,
  AlertTriangleIcon,
  LinkIcon,
  UnlinkIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace } from "@/app/actions/workspace";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BindSecretDialog } from "./bind-secret-dialog";

interface SecretsPageProps {
  params: Promise<{ slug: string; workspaceId: string }>;
}

export async function generateMetadata({ params }: SecretsPageProps): Promise<Metadata> {
  return {
    title: "Manage Secrets - Zynthex",
    description: "Manage workspace secrets and credentials",
  };
}

export default async function WorkspaceSecretsPage({ params }: SecretsPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  const wsResult = await getWorkspace(workspaceId);
  if (!wsResult.success || !wsResult.data) {
    return notFound();
  }

  const workspace = wsResult.data;

  // Parse workspace content to find credential references
  const content = workspace.content as {
    nodes?: Array<{ id: string; data?: { credential_ref?: string; type?: string; [key: string]: unknown } }>;
  } | null;
  
  const credentialRefs: Array<{
    nodeId: string;
    credentialRef: string;
    nodeType?: string;
  }> = [];

  if (content?.nodes) {
    for (const node of content.nodes) {
      if (node.data?.credential_ref) {
        credentialRefs.push({
          nodeId: node.id,
          credentialRef: node.data.credential_ref as string,
          nodeType: node.data.type,
        });
      }
    }
  }

  // Get bound secrets (secrets that have been connected to this workspace)
  const boundSecrets = workspace.secrets || [];
  const boundRefs = new Set(boundSecrets.map((s) => s.credentialRef));

  // Identify unbound credentials
  const unboundCredentials = credentialRefs.filter(
    (ref) => !boundRefs.has(ref.credentialRef)
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${slug}/workspaces/${workspaceId}`}>
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Manage Secrets</h1>
                <p className="text-sm text-muted-foreground">
                  {workspace.name} - Connect your credentials
                </p>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Unbound Warning */}
              {unboundCredentials.length > 0 && (
                <Card className="border-amber-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <AlertTriangleIcon className="size-5" />
                      Unbound Credentials
                    </CardTitle>
                    <CardDescription>
                      This workspace has {unboundCredentials.length} credential
                      reference(s) that need to be connected to your accounts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unboundCredentials.map((cred) => (
                        <div
                          key={cred.credentialRef}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <UnlinkIcon className="size-4 text-amber-500" />
                            <div>
                              <p className="text-sm font-medium">
                                {cred.nodeType || "Unknown"} Node
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                Ref: {cred.credentialRef.slice(0, 16)}...
                              </p>
                            </div>
                          </div>
                          <BindSecretDialog
                            workspaceId={workspaceId}
                            credentialRef={cred.credentialRef}
                            nodeType={cred.nodeType}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bound Secrets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyIcon className="size-5" />
                    Connected Credentials
                  </CardTitle>
                  <CardDescription>
                    Credentials that are connected to this workspace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {boundSecrets.length > 0 ? (
                    <div className="space-y-3">
                      {boundSecrets.map((secret) => (
                        <div
                          key={secret.credentialRef}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <LinkIcon className="size-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">
                                {secret.name || secret.provider}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {secret.credentialRef.slice(0, 24)}...
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {secret.isBound ? "Bound" : "Unbound"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No credentials connected yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <Card>
                <CardHeader>
                  <CardTitle>About Secret Isolation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    When you fork or clone a workspace, credentials are never copied.
                    Instead, the workflow contains opaque credential references that
                    you need to bind to your own accounts.
                  </p>
                  <p>
                    This ensures that sensitive information like API keys, OAuth
                    tokens, and passwords are never shared, even when collaborating
                    on workflows.
                  </p>
                  <p>
                    Pull request diffs will never show credential values - only the
                    structural changes to your workflow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
