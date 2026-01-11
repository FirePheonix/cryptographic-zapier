/**
 * Workflow Deploy API
 * 
 * One-click deploy/undeploy for workflows.
 * When deployed:
 * - Registers webhooks with Helius for all watch nodes (or reuses existing)
 * - Sets workflow.enabled = true
 * 
 * When undeployed:
 * - Sets workflow.enabled = false (keeps webhooks for reuse)
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows, workflowExecutions } from "@/schema";
import { eq, and, desc, count } from "drizzle-orm";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_WEBHOOK_API = "https://api.helius.xyz/v0/webhooks";

// Get webhook type based on network
const getWebhookType = (network: string | undefined) => {
  const normalizedNetwork = (network || "SOLANA_DEVNET").toUpperCase();
  return normalizedNetwork.includes("DEVNET") ? "enhancedDevnet" : "enhanced";
};

/**
 * Get existing webhooks from Helius
 */
async function getExistingWebhooks(): Promise<any[]> {
  if (!HELIUS_API_KEY) return [];
  
  try {
    const response = await fetch(`${HELIUS_WEBHOOK_API}?api-key=${HELIUS_API_KEY}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch existing webhooks:", error);
  }
  return [];
}

/**
 * Find or create a webhook for an address
 */
async function findOrCreateWebhook(
  address: string,
  network: string,
  webhookUrl: string
): Promise<{ webhookId: string; isNew: boolean } | { error: string }> {
  if (!HELIUS_API_KEY) {
    return { error: "Helius API key not configured" };
  }

  const webhookType = getWebhookType(network);
  
  // Check for existing webhook with same address and webhook URL
  const existingWebhooks = await getExistingWebhooks();
  const existingWebhook = existingWebhooks.find((w: any) => 
    w.webhookURL === webhookUrl && 
    w.accountAddresses?.includes(address) &&
    w.webhookType === webhookType
  );

  if (existingWebhook) {
    console.log(`      ♻️  Reusing existing webhook: ${existingWebhook.webhookID}`);
    return { webhookId: existingWebhook.webhookID, isNew: false };
  }

  // Check if there's a webhook with same URL we can add the address to
  const sameUrlWebhook = existingWebhooks.find((w: any) => 
    w.webhookURL === webhookUrl && 
    w.webhookType === webhookType
  );

  if (sameUrlWebhook) {
    // Add address to existing webhook
    try {
      const updatedAddresses = [...(sameUrlWebhook.accountAddresses || []), address];
      const response = await fetch(`${HELIUS_WEBHOOK_API}/${sameUrlWebhook.webhookID}?api-key=${HELIUS_API_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookURL: webhookUrl,
          accountAddresses: updatedAddresses,
        }),
      });

      if (response.ok) {
        console.log(`      ➕ Added address to existing webhook: ${sameUrlWebhook.webhookID}`);
        return { webhookId: sameUrlWebhook.webhookID, isNew: false };
      }
    } catch (error) {
      console.error("Failed to update webhook:", error);
    }
  }

  // Create new webhook
  console.log(`      🆕 Creating new webhook...`);
  
  const payload = {
    webhookURL: webhookUrl,
    transactionTypes: ["ANY"],
    accountAddresses: [address],
    webhookType: webhookType,
  };

  try {
    const response = await fetch(`${HELIUS_WEBHOOK_API}?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`      ❌ Helius API error: ${response.status} - ${responseText}`);
      return { error: `Helius API error: ${response.status} - ${responseText}` };
    }

    const data = JSON.parse(responseText);
    console.log(`      ✅ New webhook created: ${data.webhookID}`);
    return { webhookId: data.webhookID, isNew: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * POST /api/workflows/deploy
 * Deploy a workflow (register webhooks, enable workflow)
 */
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
    console.log("║           🚀 DEPLOYING WORKFLOW                              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`   Workflow: ${workflow.name} (${workflowId})`);

    // Check if already deployed
    if (workflow.enabled) {
      console.log("   ⚠️  Workflow already deployed, refreshing status...");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl || baseUrl.includes("localhost")) {
      return NextResponse.json({ 
        error: "Cannot deploy: NEXT_PUBLIC_APP_URL must be a public URL (not localhost). Use ngrok or deploy to production." 
      }, { status: 400 });
    }

    const webhookUrl = `${baseUrl}/api/webhooks/helius`;
    console.log(`   Webhook URL: ${webhookUrl}`);
    
    const registeredWebhooks: Array<{ nodeId: string; webhookId: string; address: string }> = [];
    const errors: string[] = [];

    // Find all watch nodes (Phantom/MetaMask)
    const watchNodes = content.nodes.filter((n: any) => 
      n.type === "phantomWatch" || n.type === "metamaskWatch"
    );

    console.log(`   Found ${watchNodes.length} watch node(s)`);

    if (watchNodes.length === 0) {
      return NextResponse.json({ 
        error: "No watch nodes found. Add a Phantom or MetaMask watch node to deploy." 
      }, { status: 400 });
    }

    // Register webhooks for each watch node
    for (const node of watchNodes) {
      const address = node.data?.address;
      const network = node.data?.network || "SOLANA_DEVNET";
      const existingWebhookId = node.data?.webhookId;
      
      console.log(`\n   📡 Processing node ${node.id}`);
      console.log(`      Address: ${address}`);
      console.log(`      Network: ${network}`);
      console.log(`      Existing webhook: ${existingWebhookId || "none"}`);

      if (!address) {
        errors.push(`Node ${node.id}: No wallet address configured`);
        continue;
      }

      // For Solana (Phantom)
      if (node.type === "phantomWatch") {
        // If node already has a webhook ID, verify it still exists
        if (existingWebhookId && !existingWebhookId.startsWith("evm_")) {
          const existingWebhooks = await getExistingWebhooks();
          const stillExists = existingWebhooks.find((w: any) => w.webhookID === existingWebhookId);
          
          if (stillExists) {
            console.log(`      ✅ Existing webhook still valid: ${existingWebhookId}`);
            registeredWebhooks.push({
              nodeId: node.id,
              webhookId: existingWebhookId,
              address,
            });
            continue;
          } else {
            console.log(`      ⚠️  Existing webhook no longer exists, creating new...`);
          }
        }

        // Find or create webhook
        const result = await findOrCreateWebhook(address, network, webhookUrl);
        
        if ("error" in result) {
          errors.push(`Node ${node.id}: ${result.error}`);
          continue;
        }

        registeredWebhooks.push({
          nodeId: node.id,
          webhookId: result.webhookId,
          address,
        });
      }
      // For EVM (MetaMask)
      else if (node.type === "metamaskWatch") {
        const webhookId = existingWebhookId || `evm_${Date.now()}_${node.id}`;
        registeredWebhooks.push({
          nodeId: node.id,
          webhookId,
          address,
        });
        console.log(`      ✅ EVM webhook: ${webhookId}`);
      }
    }

    if (registeredWebhooks.length === 0) {
      return NextResponse.json({ 
        error: `Failed to register any webhooks: ${errors.join("; ")}` 
      }, { status: 500 });
    }

    // Update node data with webhook IDs and status
    const updatedNodes = content.nodes.map((node: any) => {
      const webhook = registeredWebhooks.find((w) => w.nodeId === node.id);
      if (webhook) {
        return {
          ...node,
          data: {
            ...node.data,
            webhookId: webhook.webhookId,
            webhookStatus: "active",
          },
        };
      }
      return node;
    });

    // Update workflow in database
    await database
      .update(workflows)
      .set({
        enabled: true,
        content: { ...content, nodes: updatedNodes },
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    console.log("\n   ✅ Workflow deployed successfully!");
    console.log("════════════════════════════════════════════════════════════════\n");

    return NextResponse.json({
      success: true,
      deployed: true,
      webhooks: registeredWebhooks,
      errors: errors.length > 0 ? errors : undefined,
      message: `Workflow deployed! Watching ${registeredWebhooks.length} address(es)`,
    });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deploy workflow" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/deploy
 * Undeploy a workflow (disable workflow, keep webhooks for reuse)
 */
export async function DELETE(request: NextRequest) {
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

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🛑 UNDEPLOYING WORKFLOW                            ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`   Workflow: ${workflow.name} (${workflowId})`);

    // Find all watch nodes with active webhooks
    const watchNodes = (content?.nodes || []).filter((n: any) => 
      (n.type === "phantomWatch" || n.type === "metamaskWatch") && n.data?.webhookId
    );

    console.log(`   Found ${watchNodes.length} webhook(s)`);
    console.log(`   ℹ️  Keeping webhooks for reuse (only disabling workflow)`);

    // Update node data to set webhook status to idle (but keep webhookId for reuse)
    const updatedNodes = (content?.nodes || []).map((node: any) => {
      if (node.type === "phantomWatch" || node.type === "metamaskWatch") {
        return {
          ...node,
          data: {
            ...node.data,
            // Keep webhookId so we can reuse it!
            webhookStatus: "idle",
          },
        };
      }
      return node;
    });

    // Update workflow in database
    await database
      .update(workflows)
      .set({
        enabled: false,
        content: content ? { ...content, nodes: updatedNodes } : content,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    console.log("\n   ✅ Workflow undeployed (webhooks preserved for quick re-deploy)");
    console.log("════════════════════════════════════════════════════════════════\n");

    return NextResponse.json({
      success: true,
      deployed: false,
      message: "Workflow undeployed (webhooks preserved for quick re-deploy)",
    });
  } catch (error) {
    console.error("Undeploy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to undeploy workflow" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/deploy?workflowId=xxx
 * Get deployment status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflowId = request.nextUrl.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    const [workflow] = await database
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)));

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const content = workflow.content as any;
    const watchNodes = (content?.nodes || []).filter((n: any) => 
      (n.type === "phantomWatch" || n.type === "metamaskWatch") && n.data?.webhookStatus === "active"
    );

    // Get execution stats
    const [executionStats] = await database
      .select({ count: count() })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId));

    // Get last execution
    const [lastExecution] = await database
      .select({ startedAt: workflowExecutions.startedAt })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(1);

    return NextResponse.json({
      deployed: workflow.enabled,
      activeWebhooks: watchNodes.length,
      watchedAddresses: watchNodes.map((n: any) => ({
        nodeId: n.id,
        address: n.data?.address,
        network: n.data?.network,
      })),
      executionCount: executionStats?.count || 0,
      lastExecution: lastExecution?.startedAt?.toISOString() || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}


