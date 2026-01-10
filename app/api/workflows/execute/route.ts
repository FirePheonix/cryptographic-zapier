/**
 * Workflow Execution API
 * 
 * Executes a workflow by processing nodes in topological order
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { database } from "@/lib/database";
import { workflowExecutions } from "@/schema";
import { eq } from "drizzle-orm";
import { executeWorkflow, type WorkflowContent } from "@/lib/engine/resolver";
import { createRateLimiter, slidingWindow } from "@/lib/rate-limit";
import { incrementUserExecutionCount } from "@/lib/redis-cache";
import { setWebhookResponse } from "@/lib/webhook-store";

// Rate limiter for manual executions: 50 per minute per user
const executionRateLimiter = createRateLimiter({
  limiter: slidingWindow(50, "1 m"),
  prefix: "execution",
});

type ExecuteRequest = {
  workflowId: string;
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  triggerInput?: Record<string, unknown>;
  webhookPath?: string; // For Respond to Webhook node support
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting per user
    const { success: rateLimitOk } = await executionRateLimiter.limit(user.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before executing more workflows." },
        { status: 429 }
      );
    }

    const body: ExecuteRequest = await request.json();
    const { workflowId, nodes, edges, triggerInput = {}, webhookPath } = body;

    if (!workflowId || !nodes || !edges) {
      return NextResponse.json(
        { error: "Missing required fields: workflowId, nodes, edges" },
        { status: 400 }
      );
    }

    // Track execution count
    await incrementUserExecutionCount(user.id, "hour");
    await incrementUserExecutionCount(user.id, "day");

    // Create execution record
    const [execution] = await database
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId: user.id,
        status: "running",
        triggerInput,
      })
      .returning();

    try {
      // Create workflow content
      const content: WorkflowContent = { nodes, edges };

      // Execute the workflow
      const result = await executeWorkflow(
        user.id,
        workflowId,
        content,
        triggerInput
      );

      // Convert node results to logs format
      const logs = result.nodeResults?.map(nr => ({
        nodeId: nr.nodeId,
        nodeType: nr.nodeType,
        status: nr.result.success ? "success" as const : "error" as const,
        input: nr.result.metadata,
        output: nr.result.output,
        error: nr.result.error?.message,
        timestamp: nr.result.metadata?.startedAt || new Date().toISOString(),
      })) || [];

      // Check if there's a Respond to Webhook node output and notify the webhook store
      if (webhookPath) {
        console.log(`[Execute] Looking for respondToWebhook node, webhookPath: ${webhookPath}`);
        console.log(`[Execute] Node results:`, result.nodeResults?.map(nr => ({ nodeId: nr.nodeId, nodeType: nr.nodeType })));
        
        const respondToWebhookResult = result.nodeResults?.find(
          nr => nr.nodeType === "respondToWebhook" && nr.result.output?.__isWebhookResponse
        );
        
        console.log(`[Execute] Found respondToWebhook result:`, respondToWebhookResult ? 'yes' : 'no');
        
        if (respondToWebhookResult) {
          const webhookOutput = respondToWebhookResult.result.output as {
            __isWebhookResponse: boolean;
            statusCode: number;
            contentType: string;
            headers: Record<string, string>;
            body: unknown;
          };
          
          console.log(`[Execute] Setting webhook response for path: ${webhookPath}`, webhookOutput);
          
          setWebhookResponse(webhookPath, {
            statusCode: webhookOutput.statusCode,
            headers: {
              "content-type": webhookOutput.contentType,
              ...webhookOutput.headers,
            },
            body: webhookOutput.body,
          });
        } else {
          console.log(`[Execute] No respondToWebhook node found or no __isWebhookResponse flag`);
        }
      } else {
        console.log(`[Execute] No webhookPath provided`);
      }

      // Update execution record
      await database
        .update(workflowExecutions)
        .set({
          status: result.success ? "completed" : "failed",
          completedAt: new Date(),
          result: result.output || result.error,
          executionLog: logs,
        })
        .where(eq(workflowExecutions.id, execution.id));

      return NextResponse.json({
        success: result.success,
        executionId: execution.id,
        logs,
        result: result.output,
        error: result.error?.message,
      });
    } catch (execError) {
      // Update execution record with error
      await database
        .update(workflowExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          result: { error: execError instanceof Error ? execError.message : "Unknown error" },
        })
        .where(eq(workflowExecutions.id, execution.id));

      return NextResponse.json({
        success: false,
        executionId: execution.id,
        logs: [],
        error: execError instanceof Error ? execError.message : "Workflow execution failed",
      });
    }
  } catch (error) {
    console.error("Workflow execution error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to execute workflow" 
      },
      { status: 500 }
    );
  }
}


