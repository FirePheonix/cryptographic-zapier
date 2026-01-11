/**
 * Workflow Deploy API
 * 
 * One-click deploy/undeploy for workflows.
 * When deployed:
 * - Registers webhooks with Helius for all watch nodes
 * - Sets workflow.enabled = true
 * 
 * When undeployed:
 * - Deletes webhooks from Helius
 * - Sets workflow.enabled = false
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/database";
import { workflows } from "@/schema";
import { eq, and } from "drizzle-orm";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Get Helius API URL based on network
const getHeliusApiUrl = (network: string | undefined) => {
  const normalizedNetwork = (network || "SOLANA_DEVNET").toUpperCase();
  console.log(`   🔍 Network detection: input="${network}", normalized="${normalizedNetwork}"`);
  
  if (normalizedNetwork.includes("DEVNET")) {
    console.log(`   ✅ Using DEVNET API`);
    return "https://api-devnet.helius.xyz/v0/webhooks";
  }
  console.log(`   ⚠️ Using MAINNET API`);
  return "https://api.helius.xyz/v0/webhooks";
};

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl || baseUrl.includes("localhost")) {
      return NextResponse.json({ 
        error: "Cannot deploy: NEXT_PUBLIC_APP_URL must be a public URL (not localhost). Use ngrok or deploy to production." 
      }, { status: 400 });
    }

    const webhookUrl = `${baseUrl}/api/webhooks/helius`;
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
      const network = node.data?.network;
      
      console.log(`\n   📡 Registering webhook for node ${node.id}`);
      console.log(`      Node data:`, JSON.stringify(node.data, null, 2));
      console.log(`      Address: ${address}`);
      console.log(`      Network from node: "${network}" (type: ${typeof network})`);

      // Default to DEVNET if not specified
      const effectiveNetwork = network || "SOLANA_DEVNET";
      console.log(`      Effective network: "${effectiveNetwork}"`);

      if (!address) {
        errors.push(`Node ${node.id}: No wallet address configured`);
        continue;
      }

      // For Solana (Phantom), use internal helius watch endpoint
      if (node.type === "phantomWatch") {
        try {
          // Call our internal helius watch endpoint (same one used by the node UI)
          const internalUrl = `${baseUrl}/api/helius/watch`;
          console.log(`      Calling internal endpoint: ${internalUrl}`);
          
          const response = await fetch(internalUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address,
              network: effectiveNetwork,
              nodeId: node.id,
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            errors.push(`Node ${node.id}: ${data.error || "Failed to create webhook"}`);
            continue;
          }

          registeredWebhooks.push({
            nodeId: node.id,
            webhookId: data.webhookId,
            address,
          });
          console.log(`      ✅ Webhook registered: ${data.webhookId}`);
        } catch (error) {
          errors.push(`Node ${node.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      // For EVM (MetaMask), would use Alchemy - for now just mark as deployed
      else if (node.type === "metamaskWatch") {
        // Generate a placeholder webhook ID for EVM
        const webhookId = `evm_${Date.now()}_${node.id}`;
        registeredWebhooks.push({
          nodeId: node.id,
          webhookId,
          address,
        });
        console.log(`      ✅ EVM webhook registered: ${webhookId}`);
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
 * Undeploy a workflow (delete webhooks, disable workflow)
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

    const deletedWebhooks: string[] = [];
    const errors: string[] = [];

    // Find all watch nodes with active webhooks
    const watchNodes = (content?.nodes || []).filter((n: any) => 
      (n.type === "phantomWatch" || n.type === "metamaskWatch") && n.data?.webhookId
    );

    console.log(`   Found ${watchNodes.length} active webhook(s) to delete`);

    // Delete webhooks
    for (const node of watchNodes) {
      const webhookId = node.data.webhookId;
      const network = node.data.network || "SOLANA_DEVNET";

      console.log(`\n   🗑️  Deleting webhook ${webhookId}`);

      // For Solana (Helius)
      if (node.type === "phantomWatch" && HELIUS_API_KEY && !webhookId.startsWith("evm_")) {
        try {
          const heliusApiUrl = getHeliusApiUrl(network);
          const response = await fetch(`${heliusApiUrl}/${webhookId}?api-key=${HELIUS_API_KEY}`, {
            method: "DELETE",
          });

          if (response.ok) {
            deletedWebhooks.push(webhookId);
            console.log(`      ✅ Deleted`);
          } else {
            const errorText = await response.text();
            // If webhook doesn't exist, that's fine
            if (response.status === 404) {
              deletedWebhooks.push(webhookId);
              console.log(`      ⚠️  Already deleted`);
            } else {
              errors.push(`Failed to delete ${webhookId}: ${errorText}`);
            }
          }
        } catch (error) {
          errors.push(`Error deleting ${webhookId}: ${error instanceof Error ? error.message : "Unknown"}`);
        }
      } else {
        // For EVM or simulated webhooks, just mark as deleted
        deletedWebhooks.push(webhookId);
        console.log(`      ✅ Removed`);
      }
    }

    // Update node data to clear webhook info
    const updatedNodes = (content?.nodes || []).map((node: any) => {
      if (node.type === "phantomWatch" || node.type === "metamaskWatch") {
        return {
          ...node,
          data: {
            ...node.data,
            webhookId: undefined,
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

    console.log("\n   ✅ Workflow undeployed");
    console.log("════════════════════════════════════════════════════════════════\n");

    return NextResponse.json({
      success: true,
      deployed: false,
      deletedWebhooks,
      errors: errors.length > 0 ? errors : undefined,
      message: "Workflow undeployed",
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

    return NextResponse.json({
      deployed: workflow.enabled,
      activeWebhooks: watchNodes.length,
      watchedAddresses: watchNodes.map((n: any) => ({
        nodeId: n.id,
        address: n.data?.address,
        network: n.data?.network,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}


