import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { parseError } from "@/lib/error/parse";
import {
  type WorkflowContent,
  executeWorkflowWithContext,
} from "@/lib/workflow-executor-new";
import { workflows, workflowExecutions } from "@/schema";
import { createRateLimiter, slidingWindow } from "@/lib/rate-limit";
import {
  getCachedWorkflow,
  setCachedWorkflow,
  incrementUserExecutionCount,
} from "@/lib/redis-cache";

export const maxDuration = 60; // 1 minute max for workflow execution

// Create rate limiter for webhook triggers: 100 requests per minute per workflow
const webhookRateLimiter = createRateLimiter({
  limiter: slidingWindow(100, "1 m"),
  prefix: "webhook",
});

type RouteParams = {
  params: Promise<{
    workflowId: string;
  }>;
};

/**
 * POST /api/trigger/:workflowId
 * 
 * Webhook endpoint to trigger a workflow execution.
 * Accepts JSON payload that will be passed to the workflow.
 * 
 * Uses the new operation-based engine for execution:
 * - Provider adapters for Google, OpenAI, Email, etc.
 * - Centralized credential management
 * - Variable interpolation ({{previous.output}}, {{trigger.field}})
 * - Rate limiting and retry logic
 * 
 * Returns:
 * - 200: Workflow executed successfully
 * - 400: Invalid request (no workflow ID, invalid JSON)
 * - 404: Workflow not found
 * - 403: Workflow is disabled
 * - 500: Execution error
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { workflowId } = await params;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    // Apply rate limiting per workflow
    const { success: rateLimitOk } = await webhookRateLimiter.limit(workflowId);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Parse request body
    let triggerInput: Record<string, unknown>;
    try {
      triggerInput = await request.json();
    } catch {
      triggerInput = {};
    }

    // Try to fetch from cache first
    let workflow: typeof workflows.$inferSelect | null = await getCachedWorkflow<typeof workflows.$inferSelect>(
      workflowId
    ) ?? null;

    // If not in cache, fetch from database
    if (!workflow) {
      workflow = await database.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
      }) ?? null;

      // Cache the workflow for future requests
      if (workflow) {
        await setCachedWorkflow(workflowId, workflow);
      }
    }

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check if workflow is enabled
    if (!workflow.enabled) {
      return NextResponse.json(
        { error: "Workflow is disabled" },
        { status: 403 }
      );
    }

    // Validate workflow content
    const content = workflow.content as WorkflowContent | null;
    if (!content || !content.nodes || content.nodes.length === 0) {
      return NextResponse.json(
        { error: "Workflow has no nodes configured" },
        { status: 400 }
      );
    }

    // Track execution count for analytics
    await incrementUserExecutionCount(workflow.userId, "hour");
    await incrementUserExecutionCount(workflow.userId, "day");

    // Create execution record
    const [execution] = await database
      .insert(workflowExecutions)
      .values({
        workflowId: workflow.id,
        userId: workflow.userId,
        status: "running",
        triggerInput,
      })
      .returning();

    // Execute the workflow using the new engine
    const result = await executeWorkflowWithContext(
      workflow.userId,
      workflow.id,
      content, 
      triggerInput
    );

    // Convert nodeResults to legacy executionLog format
    const executionLog = result.nodeResults.map(nr => ({
      nodeId: nr.nodeId,
      nodeType: nr.nodeType,
      status: nr.result.success ? "success" as const : "error" as const,
      input: {},
      output: nr.result.output,
      error: nr.result.error?.message,
      timestamp: nr.result.metadata.startedAt,
    }));

    // Update execution record with results
    await database
      .update(workflowExecutions)
      .set({
        status: result.success ? "completed" : "failed",
        completedAt: new Date(),
        result: result.success ? result.output : { error: result.error },
        executionLog,
      })
      .where(eq(workflowExecutions.id, execution.id));

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message,
          executionId: execution.id,
          executionLog,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      executionId: execution.id,
      executionLog,
    });
  } catch (error) {
    const message = parseError(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trigger/:workflowId
 * 
 * Returns information about the workflow webhook.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { workflowId } = await params;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    // Fetch the workflow (basic info only)
    const workflow = await database.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workflowId: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      webhookUrl: `${request.url}`,
      method: "POST",
      contentType: "application/json",
      description: "Send a POST request with JSON body to trigger this workflow",
    });
  } catch (error) {
    const message = parseError(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
