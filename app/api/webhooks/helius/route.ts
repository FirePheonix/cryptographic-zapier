/**
 * Helius Webhook Receiver
 * 
 * Receives Solana transaction events from Helius webhooks
 * and triggers connected workflows.
 */

import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { workflows, workflowExecutions } from "@/schema";
import { executeWorkflow } from "@/lib/engine/executor";
import { eq } from "drizzle-orm";
import { invalidateWorkflowCache } from "@/lib/redis-cache";

export async function POST(request: NextRequest) {
  try {
    // Handle empty body (Helius health checks)
    const text = await request.text();
    
    if (!text || text.trim() === "") {
      console.log("📡 Helius health check received (empty body)");
      return NextResponse.json({ status: "ok", message: "Webhook receiver is healthy" });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      console.log("⚠️  Non-JSON request received:", text.substring(0, 100));
      return NextResponse.json({ status: "ok", message: "Received non-JSON request" });
    }

    // Handle empty array (no transactions)
    if (Array.isArray(body) && body.length === 0) {
      console.log("📡 Empty transaction array received");
      return NextResponse.json({ status: "ok", message: "No transactions to process" });
    }

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🟣 HELIUS WEBHOOK RECEIVED                         ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    console.log("\n📥 Raw payload:");
    console.log(JSON.stringify(body, null, 2).substring(0, 2000));

    // Helius sends an array of transactions
    const transactions = Array.isArray(body) ? body : [body];

    console.log(`\n📊 Received ${transactions.length} transaction(s)`);

    for (const tx of transactions) {
      // Handle both raw and enhanced webhook formats
      const signature = tx.signature || tx.transaction?.signatures?.[0];
      const slot = tx.slot;
      const blockTime = tx.blockTime;
      
      console.log("\n💸 Transaction:");
      console.log("   Signature:", signature);
      console.log("   Slot:", slot);
      console.log("   Block Time:", blockTime ? new Date(blockTime * 1000).toISOString() : "N/A");
      
      // Raw format - extract transfer info from meta
      if (tx.meta && !tx.nativeTransfers) {
        const { preBalances, postBalances, fee } = tx.meta;
        const accountKeys = tx.transaction?.message?.accountKeys || [];
        
        console.log("   Fee:", fee, "lamports");
        
        if (preBalances && postBalances) {
          console.log("\n   💰 Balance Changes:");
          accountKeys.forEach((account: string, i: number) => {
            const change = postBalances[i] - preBalances[i];
            if (change !== 0) {
              const solAmount = change / 1_000_000_000;
              console.log(`      ${account}: ${change > 0 ? '+' : ''}${solAmount} SOL`);
            }
          });
        }
      }

      // Enhanced format - Native SOL transfers
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        console.log("\n   💰 Native SOL Transfers:");
        for (const transfer of tx.nativeTransfers) {
          const solAmount = transfer.amount / 1_000_000_000;
          console.log(`      ${transfer.fromUserAccount} → ${transfer.toUserAccount}`);
          console.log(`      Amount: ${solAmount} SOL`);
        }
      }
    }

    console.log("\n════════════════════════════════════════════════════════════════\n");

    // Trigger matching workflows
    await triggerWorkflows(transactions);

    return NextResponse.json({
      received: true,
      processed: transactions.length,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("\n❌ Helius webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    service: "helius-webhook",
    message: "Helius webhook receiver is running"
  });
}

/**
 * Trigger workflows that are watching for these transactions
 */
async function triggerWorkflows(transactions: any[]) {
  try {
    // Extract all involved addresses from transactions
    const involvedAddresses = new Set<string>();
    
    for (const tx of transactions) {
      // Get addresses from account keys (raw format)
      const accountKeys = tx.transaction?.message?.accountKeys || [];
      accountKeys.forEach((addr: string) => involvedAddresses.add(addr));
      
      // Get addresses from native transfers (enhanced format)
      if (tx.nativeTransfers) {
        tx.nativeTransfers.forEach((transfer: any) => {
          involvedAddresses.add(transfer.fromUserAccount);
          involvedAddresses.add(transfer.toUserAccount);
        });
      }
    }

    console.log("🔍 Looking for workflows watching addresses:", Array.from(involvedAddresses));

    // Find only DEPLOYED workflows (enabled = true)
    const deployedWorkflows = await database
      .select()
      .from(workflows)
      .where(eq(workflows.enabled, true));
    
    console.log(`   Found ${deployedWorkflows.length} deployed workflow(s)`);

    let triggeredCount = 0;

    for (const workflow of deployedWorkflows) {
      const workflowContent = workflow.content as any;
      if (!workflowContent) {
        console.log(`   ⚠️  Workflow ${workflow.id} has no content, skipping`);
        continue;
      }
      
      const nodes = workflowContent.nodes || [];
      
      // Find Phantom watch nodes
      const phantomNodes = nodes.filter((n: any) => 
        n.type === "phantomWatch" || n.type === "metamaskWatch"
      );
      
      if (phantomNodes.length === 0) {
        continue;
      }

      console.log(`   📋 Workflow "${workflow.name}" has ${phantomNodes.length} watch node(s)`);

      for (const watchNode of phantomNodes) {
        const watchedAddress = watchNode.data?.address;
        const webhookStatus = watchNode.data?.webhookStatus;
        
        console.log(`      Watch node: ${watchNode.id}`);
        console.log(`      Address: ${watchedAddress}`);
        console.log(`      Status: ${webhookStatus}`);
        
        if (!watchedAddress) {
          console.log(`      ⚠️  No address configured`);
          continue;
        }
        
        if (webhookStatus !== "active") {
          console.log(`      ⚠️  Webhook not active`);
          continue;
        }
        
        if (!involvedAddresses.has(watchedAddress)) {
          console.log(`      ⚠️  Address not in transaction`);
          continue;
        }

        console.log(`\n🚀 TRIGGERING WORKFLOW: ${workflow.name} (${workflow.id})`);
        console.log(`   Matched address: ${watchedAddress}`);
        
        // Extract transaction details for trigger output
        const tx = transactions[0];
        const triggerOutput = {
          transactions,
          matchedAddress: watchedAddress,
          timestamp: new Date().toISOString(),
          // Flatten for easy access
          signature: tx.signature || tx.transaction?.signatures?.[0],
          slot: tx.slot,
          blockTime: tx.blockTime,
          amount: extractAmount(tx),
          from: extractFromAddress(tx),
          to: extractToAddress(tx),
        };
        
        console.log(`   Trigger output:`, JSON.stringify({
          signature: triggerOutput.signature,
          amount: triggerOutput.amount,
          from: triggerOutput.from,
          to: triggerOutput.to,
        }, null, 2));
        
        try {
          // Update the node output in the workflow content
          const updatedNodes = nodes.map((n: any) => {
            if (n.id === watchNode.id) {
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
          
          // Save the updated workflow content
          await database
            .update(workflows)
            .set({
              content: {
                ...workflowContent,
                nodes: updatedNodes,
              },
              updatedAt: new Date(),
            })
            .where(eq(workflows.id, workflow.id));
          
          // Invalidate cache so frontend gets fresh data
          await invalidateWorkflowCache(workflow.id);
          
          console.log(`   ✅ Node output updated in workflow (cache invalidated)`);

          // Create execution record
          const [execution] = await database
            .insert(workflowExecutions)
            .values({
              workflowId: workflow.id,
              userId: workflow.userId,
              status: "running",
              startedAt: new Date(),
              triggerInput: triggerOutput,
            })
            .returning();

          console.log(`   ✅ Execution record created: ${execution.id}`);

          // Execute workflow (don't await - run in background)
          executeWorkflow(
            execution.id,
            workflowContent,
            triggerOutput,
            workflow.userId,
            workflow.id  // Pass workflowId so node outputs are updated in workflow content
          ).catch((error) => {
            console.error(`   ❌ Workflow execution failed:`, error);
          });
          
          triggeredCount++;
        } catch (error) {
          console.error(`   ❌ Failed to create execution:`, error);
        }
      }
    }
    
    console.log(`\n📊 Triggered ${triggeredCount} workflow(s)`);
    
  } catch (error) {
    console.error("❌ Error triggering workflows:", error);
  }
}

/**
 * Extract SOL amount from transaction
 */
function extractAmount(tx: any): number {
  // From enhanced format
  if (tx.nativeTransfers?.[0]) {
    return tx.nativeTransfers[0].amount / 1_000_000_000;
  }
  // From raw format - look at balance changes
  if (tx.meta?.preBalances && tx.meta?.postBalances) {
    // Find the largest balance decrease (sender)
    const changes = tx.meta.postBalances.map((post: number, i: number) => 
      post - tx.meta.preBalances[i]
    );
    const maxDecrease = Math.max(...changes.map((c: number) => Math.abs(c)));
    return maxDecrease / 1_000_000_000;
  }
  // Try to get from transaction itself
  if (tx.amount) {
    return tx.amount / 1_000_000_000;
  }
  return 0;
}

/**
 * Extract sender address from transaction
 */
function extractFromAddress(tx: any): string {
  // Enhanced format
  if (tx.nativeTransfers?.[0]) {
    return tx.nativeTransfers[0].fromUserAccount;
  }
  // Raw format - first signer is usually sender
  if (tx.transaction?.message?.accountKeys) {
    return tx.transaction.message.accountKeys[0];
  }
  // Feepayer
  if (tx.feePayer) {
    return tx.feePayer;
  }
  return "";
}

/**
 * Extract recipient address from transaction
 */
function extractToAddress(tx: any): string {
  // Enhanced format
  if (tx.nativeTransfers?.[0]) {
    return tx.nativeTransfers[0].toUserAccount;
  }
  // Raw format - second account is often recipient
  if (tx.transaction?.message?.accountKeys?.length > 1) {
    return tx.transaction.message.accountKeys[1];
  }
  return "";
}


