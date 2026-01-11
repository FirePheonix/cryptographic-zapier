import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  GitCommitHorizontalIcon,
  ClockIcon,
  UserIcon,
  RotateCcwIcon,
  DiffIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace, getWorkspaceVersion } from "@/app/actions/workspace";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RestoreVersionButton } from "./restore-button";

interface VersionDetailPageProps {
  params: Promise<{ slug: string; workspaceId: string; version: string }>;
}

export async function generateMetadata({ params }: VersionDetailPageProps): Promise<Metadata> {
  const { version } = await params;
  return {
    title: `Version ${version} - Zynthex`,
    description: "View workspace version details",
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function VersionDetailPage({ params }: VersionDetailPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId, version: versionStr } = await params;
  const versionNum = parseInt(versionStr, 10);

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  if (isNaN(versionNum)) {
    return notFound();
  }

  const orgResult = await getOrganizationBySlug(slug);
  if (!orgResult.success || !orgResult.data) {
    return notFound();
  }

  const workspaceResult = await getWorkspace(workspaceId);
  if (!workspaceResult.success || !workspaceResult.data) {
    return notFound();
  }

  const versionResult = await getWorkspaceVersion(workspaceId, versionNum);
  if (!versionResult.success || !versionResult.data) {
    return notFound();
  }

  const workspace = workspaceResult.data;
  const versionData = versionResult.data;
  const isCurrentVersion = versionNum === workspace.currentVersion;
  const canRestore = workspace.userRole === "owner" || workspace.userRole === "reviewer";

  // Count nodes and edges in the version
  const content = versionData.content as { nodes?: unknown[]; edges?: unknown[] } | null;
  const nodeCount = content?.nodes?.length || 0;
  const edgeCount = content?.edges?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/workspaces/${workspaceId}/history`}>
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to History
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Version Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <GitCommitHorizontalIcon className="size-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold font-mono">v{versionNum}</h1>
                  {isCurrentVersion && (
                    <Badge variant="default">Current</Badge>
                  )}
                </div>
                <p className="text-lg text-foreground">
                  {versionData.message || `Version ${versionNum}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCurrentVersion && canRestore && (
                <RestoreVersionButton
                  workspaceId={workspaceId}
                  version={versionNum}
                  slug={slug}
                />
              )}
              <Button variant="outline" asChild>
                <Link href={`/orgs/${slug}/workspaces/${workspaceId}/history/${versionNum}/diff`}>
                  <DiffIcon className="size-4 mr-2" />
                  View Diff
                </Link>
              </Button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Created by</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>
                      <UserIcon className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-mono text-sm truncate">
                    {versionData.createdByUserId?.slice(0, 12) || "Unknown"}...
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Created at</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-5 text-muted-foreground" />
                  <time dateTime={new Date(versionData.createdAt).toISOString()}>
                    {formatDate(versionData.createdAt)}
                  </time>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Contents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-blue-500" />
                    {nodeCount} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-green-500" />
                    {edgeCount} connections
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Snapshot</CardTitle>
              <CardDescription>
                Preview of the workflow at this version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  This version contains {nodeCount} nodes and {edgeCount} connections.
                </p>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${slug}/workspaces/${workspaceId}/history/${versionNum}/preview`}>
                    Open Full Preview
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
