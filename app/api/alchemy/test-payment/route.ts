/**
 * Test Endpoint - Simulate Solana Payment
 * 
 * For hackathon demo: simulates receiving a Solana payment
 * Triggers the workflow as if a real payment was received
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, amount, from, token } = body;

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           💰 SIMULATING CRYPTO PAYMENT                       ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log("\n📥 Request body:", JSON.stringify(body, null, 2));

    // Simulate an Alchemy webhook payload for Solana
    const simulatedPayment = {
      webhookId: `solana_test_${Date.now()}`,
      id: `test_${Date.now()}`,
      createdAt: new Date().toISOString(),
      type: "ADDRESS_ACTIVITY",
      event: {
        network: "SOLANA_DEVNET",
        activity: [
          {
            fromAddress: from || "GwsRP9HHhCvEQeu3HTFzsVL6DEtnnYw4ALEtA3fMBC9Q",
            toAddress: address || "YourWalletAddressHere",
            value: amount || 1.5,
            asset: token || "SOL",
            category: "transfer",
            hash: `sim_${Date.now().toString(36)}`,
            blockNum: Math.floor(Math.random() * 1000000).toString(),
          },
        ],
      },
    };

    console.log("\n📤 Simulated payment payload:");
    console.log(JSON.stringify(simulatedPayment, null, 2));
    
    console.log("\n🔗 Calling webhook endpoint...");

    // Call the webhook endpoint internally
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/alchemy`;
    console.log("   URL:", webhookUrl);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simulatedPayment),
    });

    const webhookResult = await webhookResponse.json();

    console.log("\n📨 Webhook response:");
    console.log("   Status:", webhookResponse.status);
    console.log("   Body:", JSON.stringify(webhookResult, null, 2));

    const response = {
      success: true,
      message: "Payment simulated successfully",
      payment: {
        from: simulatedPayment.event.activity[0].fromAddress,
        to: simulatedPayment.event.activity[0].toAddress,
        amount: simulatedPayment.event.activity[0].value,
        asset: simulatedPayment.event.activity[0].asset,
        hash: simulatedPayment.event.activity[0].hash,
      },
      webhookResult,
    };

    console.log("\n✅ Final response:");
    console.log(JSON.stringify(response, null, 2));
    console.log("\n════════════════════════════════════════════════════════════════\n");

    return NextResponse.json(response);
  } catch (error) {
    console.error("\n❌ Test payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to simulate payment" },
      { status: 500 }
    );
  }
}

// GET endpoint to show usage info
export async function GET() {
  return NextResponse.json({
    description: "Simulate a Solana payment for testing",
    usage: {
      method: "POST",
      body: {
        address: "Recipient wallet address (optional)",
        amount: "Amount in SOL (default: 1.5)",
        from: "Sender address (optional)",
        token: "Token symbol (default: SOL)",
      },
    },
    example: {
      address: "YourPhantomWalletAddress",
      amount: 2.5,
      from: "GwsRP9HHhCvEQeu3HTFzsVL6DEtnnYw4ALEtA3fMBC9Q",
      token: "SOL",
    },
  });
}


