import { eq, and, desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows, workflowExecutions } from "@/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CheckCircle2Icon, XCircleIcon, ClockIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Execution History - Zynthex",
  description: "View workflow execution history",
};

type ExecutionsPageProps = {
  params: Promise<{
    workflowId: string;
  }>;
};

type ExecutionLogEntry = {
  nodeId: string;
  nodeType: string;
  status: string;
  output: string | Record<string, unknown> | null;
  error?: string;
  timestamp: string;
};

const ExecutionsPage = async ({ params }: ExecutionsPageProps) => {
  const { workflowId } = await params;
  const profile = await currentUserProfile();
  const user = await currentUser();

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  // Verify workflow ownership
  const workflow = await database.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)),
  });

  if (!workflow) {
    notFound();
  }

  const executions = await database.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.workflowId, workflowId),
    orderBy: [desc(workflowExecutions.startedAt)],
    limit: 100,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/workflows/${workflowId}`}>
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <p className="text-muted-foreground">Execution History</p>
          </div>
        </div>

        {executions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No executions yet</h2>
            <p className="text-muted-foreground mb-4">
              Trigger your workflow to see execution history here
            </p>
            <Button asChild>
              <Link href={`/workflows/${workflowId}`}>
                Go to Workflow Editor
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => {
              const triggerInput = execution.triggerInput as Record<string, unknown> | null;
              const result = execution.result as Record<string, unknown> | null;
              const executionLog = execution.executionLog as ExecutionLogEntry[] | null;

              return (
              <div
                key={execution.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {execution.status === "completed" ? (
                      <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                    ) : execution.status === "failed" ? (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">
                        {execution.status === "completed"
                          ? "Completed"
                          : execution.status === "failed"
                          ? "Failed"
                          : "Running"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground">
                    {execution.id.slice(0, 8)}...
                  </code>
                </div>

                {triggerInput && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Trigger Input
                    </summary>
                    <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-auto max-h-40">
                      {JSON.stringify(triggerInput, null, 2)}
                    </pre>
                  </details>
                )}

                {result && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Result
                    </summary>
                    <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-auto max-h-40">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                )}

                {executionLog && executionLog.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Execution Log ({executionLog.length} steps)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {executionLog.map((log, index) => (
                        <div
                          key={log.nodeId}
                          className="p-3 rounded-lg bg-muted text-xs"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {index + 1}. {log.nodeType}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                log.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                          {log.error && (
                            <p className="text-red-600 mt-1">{log.error}</p>
                          )}
                          {log.output && (
                            <pre className="mt-1 text-muted-foreground overflow-auto max-h-20">
                              {String(
                                typeof log.output === "string"
                                  ? log.output.slice(0, 200)
                                  : JSON.stringify(log.output, null, 2).slice(0, 200)
                              )}
                              ...
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {execution.completedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Duration:{" "}
                    {(
                      (new Date(execution.completedAt).getTime() -
                        new Date(execution.startedAt).getTime()) /
                      1000
                    ).toFixed(2)}
                    s
                  </p>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionsPage;
