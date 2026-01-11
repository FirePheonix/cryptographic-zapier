import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  GitCompareIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  PencilIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace, getWorkspaceVersion, getWorkspaceHistory } from "@/app/actions/workspace";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HistoryDiffTabs } from "./history-diff-tabs";

interface VersionDiffPageProps {
  params: Promise<{ slug: string; workspaceId: string; version: string }>;
}

export async function generateMetadata({ params }: VersionDiffPageProps): Promise<Metadata> {
  const { version } = await params;
  return {
    title: `Diff v${version} - Zynthex`,
    description: "Compare version changes",
  };
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowContent {
  nodes: WorkflowNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface NodeDiff {
  id: string;
  type: string;
  status: DiffStatus;
  oldNode?: WorkflowNode;
  newNode?: WorkflowNode;
  changes?: string[];
}

function computeDiff(
  oldContent: WorkflowContent | null,
  newContent: WorkflowContent | null
): NodeDiff[] {
  const diffs: NodeDiff[] = [];
  const oldNodes = new Map((oldContent?.nodes || []).map((n) => [n.id, n]));
  const newNodes = new Map((newContent?.nodes || []).map((n) => [n.id, n]));

  // Check for added and modified nodes
  for (const [id, newNode] of newNodes) {
    const oldNode = oldNodes.get(id);
    if (!oldNode) {
      diffs.push({
        id,
        type: newNode.type,
        status: "added",
        newNode,
      });
    } else {
      const changes: string[] = [];
      if (oldNode.type !== newNode.type) {
        changes.push(`Type changed from ${oldNode.type} to ${newNode.type}`);
      }
      if (
        Math.abs(oldNode.position.x - newNode.position.x) > 10 ||
        Math.abs(oldNode.position.y - newNode.position.y) > 10
      ) {
        changes.push("Position changed");
      }
      if (JSON.stringify(oldNode.data) !== JSON.stringify(newNode.data)) {
        changes.push("Configuration changed");
      }

      if (changes.length > 0) {
        diffs.push({
          id,
          type: newNode.type,
          status: "modified",
          oldNode,
          newNode,
          changes,
        });
      } else {
        diffs.push({
          id,
          type: newNode.type,
          status: "unchanged",
          oldNode,
          newNode,
        });
      }
    }
  }

  // Check for removed nodes
  for (const [id, oldNode] of oldNodes) {
    if (!newNodes.has(id)) {
      diffs.push({
        id,
        type: oldNode.type,
        status: "removed",
        oldNode,
      });
    }
  }

  // Sort: added first, then modified, then removed, then unchanged
  const order: Record<DiffStatus, number> = { added: 0, modified: 1, removed: 2, unchanged: 3 };
  diffs.sort((a, b) => order[a.status] - order[b.status]);

  return diffs;
}

export default async function VersionDiffPage({ params }: VersionDiffPageProps) {
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

  // Get the current version and the previous version
  const currentVersionResult = await getWorkspaceVersion(workspaceId, versionNum);
  const prevVersionResult = versionNum > 1 
    ? await getWorkspaceVersion(workspaceId, versionNum - 1)
    : null;

  if (!currentVersionResult.success || !currentVersionResult.data) {
    return notFound();
  }

  const workspace = workspaceResult.data;
  const currentVersion = currentVersionResult.data;
  const prevVersion = prevVersionResult?.success ? prevVersionResult.data : null;

  const oldContent = prevVersion?.content as WorkflowContent | null;
  const newContent = currentVersion.content as WorkflowContent | null;

  const diffs = computeDiff(oldContent, newContent);

  const addedCount = diffs.filter((d) => d.status === "added").length;
  const removedCount = diffs.filter((d) => d.status === "removed").length;
  const modifiedCount = diffs.filter((d) => d.status === "modified").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/workspaces/${workspaceId}/history/${versionNum}`}>
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to Version
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-lg bg-primary/10">
              <GitCompareIcon className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Changes in v{versionNum}</h1>
              <p className="text-muted-foreground">
                Comparing with {versionNum > 1 ? `v${versionNum - 1}` : "empty workspace"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-8 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <PlusCircleIcon className="size-5 text-green-500" />
              <span className="font-medium">{addedCount} added</span>
            </div>
            <div className="flex items-center gap-2">
              <PencilIcon className="size-5 text-blue-500" />
              <span className="font-medium">{modifiedCount} modified</span>
            </div>
            <div className="flex items-center gap-2">
              <MinusCircleIcon className="size-5 text-red-500" />
              <span className="font-medium">{removedCount} removed</span>
            </div>
          </div>

          {/* Tabbed Diff View */}
          <HistoryDiffTabs
            oldContent={oldContent}
            newContent={newContent}
            version={versionNum}
            listDiffContent={
              <ListDiffView diffs={diffs} />
            }
          />

          {/* Unchanged nodes summary */}
          {diffs.filter(d => d.status === "unchanged").length > 0 && (
            <div className="mt-8 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {diffs.filter(d => d.status === "unchanged").length} nodes unchanged
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// List Diff View Component
function ListDiffView({ diffs }: { diffs: NodeDiff[] }) {
  return (
    <div className="space-y-4">
      {diffs.filter(d => d.status !== "unchanged").map((diff) => (
        <Card
          key={diff.id}
          className={cn(
            "overflow-hidden",
            diff.status === "added" && "border-green-500/50 bg-green-500/5",
            diff.status === "removed" && "border-red-500/50 bg-red-500/5",
            diff.status === "modified" && "border-blue-500/50 bg-blue-500/5"
          )}
        >
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {diff.status === "added" && (
                  <PlusCircleIcon className="size-4 text-green-500" />
                )}
                {diff.status === "removed" && (
                  <MinusCircleIcon className="size-4 text-red-500" />
                )}
                {diff.status === "modified" && (
                  <PencilIcon className="size-4 text-blue-500" />
                )}
                <span className="font-mono">{diff.type}</span>
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  diff.status === "added" && "border-green-500 text-green-600",
                  diff.status === "removed" && "border-red-500 text-red-600",
                  diff.status === "modified" && "border-blue-500 text-blue-600"
                )}
              >
                {diff.status}
              </Badge>
            </div>
          </CardHeader>
          {diff.changes && diff.changes.length > 0 && (
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1">
                {diff.changes.map((change, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-current" />
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ))}

      {diffs.filter(d => d.status !== "unchanged").length === 0 && (
        <div className="text-center py-12">
          <GitCompareIcon className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-1">No changes</h3>
          <p className="text-muted-foreground">
            This version is identical to the previous one.
          </p>
        </div>
      )}
    </div>
  );
}
