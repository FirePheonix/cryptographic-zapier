/**
 * Alchemy Webhook Receiver
 * 
 * Receives blockchain events from Alchemy and triggers workflow executions
 */

import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { workflows, workflowExecutions } from "@/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🔔 ALCHEMY WEBHOOK RECEIVED                        ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log("\n📥 Full webhook payload:");
    console.log(JSON.stringify(body, null, 2));

    // Alchemy webhook structure
    const { webhookId, id, createdAt, type, event } = body;

    console.log("\n📊 Parsed data:");
    console.log("   Webhook ID:", webhookId);
    console.log("   Event ID:", id);
    console.log("   Type:", type);
    console.log("   Created:", createdAt);

    if (!event || !event.activity) {
      console.log("\n⚠️  No activity in payload, returning early");
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Extract transaction data
    const activity = event.activity[0]; // First transaction in batch
    const {
      fromAddress,
      toAddress,
      value,
      asset,
      category,
      hash,
      blockNum,
    } = activity;

    console.log("\n💸 Transaction details:");
    console.log("   From:", fromAddress);
    console.log("   To:", toAddress);
    console.log("   Value:", value, asset);
    console.log("   Category:", category);
    console.log("   Hash:", hash);
    console.log("   Block:", blockNum);

    // Find workflows that are watching this address
    const metadata = body.metadata || {};
    const { userId, workflowId, nodeId } = metadata;

    console.log("\n📋 Metadata:");
    console.log("   User ID:", userId || "(none)");
    console.log("   Workflow ID:", workflowId || "(none)");
    console.log("   Node ID:", nodeId || "(none)");

    if (!workflowId) {
      console.log("\n⚠️  No workflowId in metadata - returning success (demo mode)");
      console.log("════════════════════════════════════════════════════════════════\n");
      
      // Return the transaction data even without workflow
      return NextResponse.json({ 
        received: true,
        message: "Webhook received (no workflow configured)",
        transaction: {
          from: fromAddress,
          to: toAddress,
          value,
          asset,
          hash,
        }
      });
    }

    console.log("\n🔍 Looking up workflow...");

    // Get workflow to execute
    const workflow = await database.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      console.error(`❌ Workflow ${workflowId} not found`);
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    console.log("✅ Workflow found:", workflow.name);

    // Parse workflow definition
    const workflowDef = JSON.parse(workflow.definition);

    // Create execution context with transaction data
    const triggerOutput = {
      from: fromAddress,
      to: toAddress,
      value: value || "0",
      asset: asset || "ETH",
      category,
      hash,
      blockNumber: blockNum,
      timestamp: createdAt,
      webhookId,
      eventId: id,
    };

    console.log("\n🚀 Creating execution with trigger output:");
    console.log(JSON.stringify(triggerOutput, null, 2));

    // Record execution start
    const [execution] = await database
      .insert(workflowExecutions)
      .values({
        workflowId: workflow.id,
        userId: workflow.userId,
        status: "running",
        startedAt: new Date(),
        triggerData: triggerOutput,
      })
      .returning();

    console.log("✅ Execution created:", execution.id);

    // Execute workflow asynchronously
    // NOTE: In production, this should be queued to a background job system
    executeWorkflow(execution.id, workflowDef, triggerOutput, workflow.userId).catch(
      (error) => {
        console.error("❌ Workflow execution failed:", error);
        database.update(workflowExecutions)
          .set({
            status: "failed",
            completedAt: new Date(),
            error: error.message,
          })
          .where(eq(workflowExecutions.id, execution.id))
          .catch(console.error);
      }
    );

    return NextResponse.json({
      received: true,
      executionId: execution.id,
      transaction: triggerOutput,
    });
  } catch (error) {
    console.error("Alchemy webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Execute workflow in background
 */
async function executeWorkflow(
  executionId: string,
  workflowDef: any,
  triggerOutput: any,
  userId: string
) {
  const { getProviderAdapter } = await import("@/lib/engine/adapters");
  const { interpolateConfig } = await import("@/lib/engine/interpolation");

  // Build execution context
  const context: Record<string, any> = {
    trigger: { output: triggerOutput },
  };

  const nodes = workflowDef.nodes || [];
  const results: any[] = [];

  // Execute nodes in sequence (simplified)
  for (const node of nodes) {
    if (node.type === "trigger") continue; // Skip trigger node

    try {
      // Get provider adapter
      const adapter = getProviderAdapter(node.data.provider);

      // Interpolate variables in node config
      const interpolatedData = interpolateConfig(node.data, context);

      // Execute node
      const result = await adapter.execute(
        node.data.operation,
        interpolatedData,
        { type: "api_key", apiKey: "" }, // TODO: Load actual credentials
        {
          userId,
          workflowId: workflowDef.id,
          nodeId: node.id,
          executionId,
        }
      );

      // Store result in context
      context[node.id] = result;
      results.push({ nodeId: node.id, result });

      if (!result.success) {
        throw new Error(result.error?.message || "Node execution failed");
      }
    } catch (error: any) {
      console.error(`Node ${node.id} failed:`, error);
      await database
        .update(workflowExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          error: error.message,
        })
        .where(eq(workflowExecutions.id, executionId));
      return;
    }
  }

  // Mark execution as completed
  await database
    .update(workflowExecutions)
    .set({
      status: "completed",
      completedAt: new Date(),
      results: JSON.stringify(results),
    })
    .where(eq(workflowExecutions.id, executionId));
}


