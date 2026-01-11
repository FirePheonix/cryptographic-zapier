/**
 * Test Workflow Trigger API
 * 
 * Simulates a webhook trigger to test workflow execution
 * without needing a real Solana transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows, workflowExecutions } from "@/schema";
import { eq, and } from "drizzle-orm";
import { executeWorkflow } from "@/lib/engine/executor";
import { invalidateWorkflowCache } from "@/lib/redis-cache";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    // Get workflow
    const [workflow] = await database
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)));

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const content = workflow.content as any;
    if (!content?.nodes) {
      return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
    }

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🧪 TEST WORKFLOW TRIGGER                           ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`   Workflow: ${workflow.name} (${workflowId})`);

    // Find the trigger node (watch node)
    const triggerNode = content.nodes.find((n: any) => 
      n.type === "phantomWatch" || n.type === "metamaskWatch" || n.type === "trigger"
    );

    if (!triggerNode) {
      return NextResponse.json({ 
        error: "No trigger node found. Add a Phantom or MetaMask watch node." 
      }, { status: 400 });
    }

    // Create a simulated transaction
    const simulatedTx = {
      signature: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      slot: 123456789,
      blockTime: Math.floor(Date.now() / 1000),
      nativeTransfers: [{
        fromUserAccount: triggerNode.data?.address || "TestSenderAddress11111111111111111111111",
        toUserAccount: "TestReceiverAddress22222222222222222222222",
        amount: 1_000_000_000, // 1 SOL
      }],
      feePayer: triggerNode.data?.address || "TestSenderAddress11111111111111111111111",
    };

    // Create trigger output like a real Helius webhook
    const triggerOutput = {
      transactions: [simulatedTx],
      matchedAddress: triggerNode.data?.address || "TestAddress",
      timestamp: new Date().toISOString(),
      signature: simulatedTx.signature,
      slot: simulatedTx.slot,
      blockTime: simulatedTx.blockTime,
      amount: 1.0, // 1 SOL
      from: simulatedTx.nativeTransfers[0].fromUserAccount,
      to: simulatedTx.nativeTransfers[0].toUserAccount,
      _isTest: true, // Flag to indicate this is a test
    };

    console.log("   Simulated trigger output:", JSON.stringify(triggerOutput, null, 2).substring(0, 500));

    // Update trigger node with test output
    const updatedNodes = content.nodes.map((n: any) => {
      if (n.id === triggerNode.id) {
        return {
          ...n,
          data: {
            ...n.data,
            lastOutput: triggerOutput,
            lastTriggeredAt: new Date().toISOString(),
          },
        };
      }
      return n;
    });

    // Save updated workflow content
    await database
      .update(workflows)
      .set({
        content: { ...content, nodes: updatedNodes },
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    // Invalidate cache
    await invalidateWorkflowCache(workflowId);

    // Create execution record
    const [execution] = await database
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId: user.id,
        status: "running",
        startedAt: new Date(),
        triggerInput: triggerOutput,
      })
      .returning();

    console.log(`   ✅ Test execution created: ${execution.id}`);

    // Execute workflow (don't await - run in background)
    executeWorkflow(
      execution.id,
      content,
      triggerOutput,
      user.id,
      workflowId
    ).catch((error) => {
      console.error(`   ❌ Test execution failed:`, error);
    });

    console.log("════════════════════════════════════════════════════════════════\n");

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      message: "Test workflow triggered! Check the executions page for results.",
    });
  } catch (error) {
    console.error("Test trigger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test workflow" },
      { status: 500 }
    );
  }
}
