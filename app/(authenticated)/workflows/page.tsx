import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoreVerticalIcon } from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows } from "@/schema";
import { CreateWorkflowButton } from "./create-workflow-button";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "My Workflows - Veriflow",
  description: "Manage your automation workflows",
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

const WorkflowsPage = async () => {
  const profile = await currentUserProfile();
  const user = await currentUser();

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  if (!profile.onboardedAt) {
    return redirect("/welcome");
  }

  const userWorkflows = await database.query.workflows.findMany({
    where: eq(workflows.userId, user.id),
    orderBy: (workflows, { desc }) => [desc(workflows.createdAt)],
  });

  return (
    <SidebarProvider>
      <AppSidebar workflowCount={userWorkflows.length} />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Flows</h1>
            </div>
            <CreateWorkflowButton />
          </header>

          {/* Content */}
          <div className="flex-1 p-6">
            {userWorkflows.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold mb-2">No workflows yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create your first workflow to start automating
                </p>
                <CreateWorkflowButton />
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[400px]">Name</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead>Last modified</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userWorkflows.map((workflow) => {
                      const nodeCount = workflow.content?.nodes?.length || 0;
                      const lastModified = workflow.updatedAt || workflow.createdAt;
                      
                      return (
                        <TableRow key={workflow.id}>
                          <TableCell>
                            <Link
                              href={`/workflows/${workflow.id}`}
                              className="font-medium hover:underline"
                            >
                              {workflow.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {nodeCount > 0 ? (
                                <span className="text-muted-foreground text-sm">
                                  {nodeCount} step{nodeCount !== 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getRelativeTime(new Date(lastModified))}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={workflow.enabled}
                              disabled
                              aria-label="Workflow status"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm">
                              <MoreVerticalIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default WorkflowsPage;
