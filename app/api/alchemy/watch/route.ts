/**
 * Alchemy Watch API
 * 
 * Creates/deletes Alchemy webhooks to watch blockchain addresses
 */

import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Alchemy Notify API endpoint (for creating webhooks)
const ALCHEMY_NOTIFY_URL = "https://dashboard.alchemy.com/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, network, nodeId, chain } = body;

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           👁️  START WATCHING ADDRESS                         ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log("\n📥 Request body:", JSON.stringify(body, null, 2));

    if (!address) {
      console.log("❌ Error: Address is required");
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    if (!ALCHEMY_API_KEY) {
      console.log("❌ Error: Alchemy API key not configured in .env");
      return NextResponse.json({ error: "Alchemy API key not configured" }, { status: 500 });
    }

    console.log("\n✅ Alchemy API key found:", ALCHEMY_API_KEY.substring(0, 10) + "...");

    // Get the webhook URL (your app's public URL)
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/alchemy`;
    console.log("📌 Webhook URL:", webhookUrl);

    // For Solana, Alchemy uses a different approach
    if (chain === "solana") {
      const webhookId = `solana_${Date.now()}_${nodeId}`;
      
      console.log("\n🟣 Solana chain detected");
      console.log("   Address:", address);
      console.log("   Network:", network);
      console.log("   Generated Webhook ID:", webhookId);
      
      const response = {
        success: true,
        webhookId,
        address,
        network,
        message: `Watching ${address} for incoming payments`,
        note: "For Solana devnet testing, use /api/alchemy/test-payment to simulate",
      };

      console.log("\n✅ Response:");
      console.log(JSON.stringify(response, null, 2));
      console.log("════════════════════════════════════════════════════════════════\n");

      return NextResponse.json(response);
    }

    // For EVM chains (Ethereum, Polygon, etc.), use Alchemy Notify API
    console.log("\n🔵 EVM chain detected, calling Alchemy Notify API...");
    
    const alchemyPayload = {
      network: network || "ETH_MAINNET",
      webhook_type: "ADDRESS_ACTIVITY",
      webhook_url: webhookUrl,
      addresses: [address],
    };
    
    console.log("   Payload:", JSON.stringify(alchemyPayload, null, 2));
    
    const response = await fetch(`${ALCHEMY_NOTIFY_URL}/create-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Alchemy-Token": ALCHEMY_API_KEY,
      },
      body: JSON.stringify(alchemyPayload),
    });

    const responseText = await response.text();
    console.log("\n📨 Alchemy API response:");
    console.log("   Status:", response.status);
    console.log("   Body:", responseText);

    if (!response.ok) {
      console.error("❌ Alchemy API error");
      return NextResponse.json(
        { error: `Alchemy API error: ${response.status} - ${responseText}` },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);

    const result = {
      success: true,
      webhookId: data.id,
      address,
      network,
      message: `Watching ${address} for incoming payments`,
    };

    console.log("\n✅ Success! Response:");
    console.log(JSON.stringify(result, null, 2));
    console.log("════════════════════════════════════════════════════════════════\n");

    return NextResponse.json(result);
  } catch (error) {
    console.error("\n❌ Watch API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { webhookId } = await request.json();

    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }

    // For Solana (simulated webhooks), just log
    if (webhookId.startsWith("solana_")) {
      console.log(`[Alchemy] Stopped watching (simulated): ${webhookId}`);
      return NextResponse.json({ success: true });
    }

    // For EVM chains, delete via Alchemy API
    if (!ALCHEMY_API_KEY) {
      return NextResponse.json({ error: "Alchemy API key not configured" }, { status: 500 });
    }

    const response = await fetch(`${ALCHEMY_NOTIFY_URL}/delete-webhook?webhook_id=${webhookId}`, {
      method: "DELETE",
      headers: {
        "X-Alchemy-Token": ALCHEMY_API_KEY,
      },
    });

    if (!response.ok) {
      console.error("Failed to delete webhook:", await response.text());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete webhook" },
      { status: 500 }
    );
  }
}


