/**
 * CoinGate Webhook Handler
 * 
 * Handles payment status callbacks from CoinGate
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");
    const executionId = searchParams.get("executionId");

    console.log("CoinGate webhook received:", {
      workflowId,
      executionId,
      payload,
    });

    // Validate webhook has required parameters
    if (!workflowId || !executionId) {
      return NextResponse.json(
        { error: "Missing workflowId or executionId" },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Store webhook data in executions table
    const { error: updateError } = await supabase
      .from("executions")
      .update({
        status: "completed",
        result: {
          webhookData: payload,
          coingateOrderId: payload.id,
          orderId: payload.order_id,
          status: payload.status,
          priceAmount: payload.price_amount,
          priceCurrency: payload.price_currency,
          receiveAmount: payload.receive_amount,
          receiveCurrency: payload.receive_currency,
          paymentAddress: payload.payment_address,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (updateError) {
      console.error("Failed to update execution:", updateError);
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 500 }
      );
    }

    // Log the payment status
    console.log(`CoinGate payment ${payload.status}:`, {
      orderId: payload.order_id,
      amount: `${payload.price_amount} ${payload.price_currency}`,
      crypto: `${payload.receive_amount} ${payload.receive_currency}`,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("CoinGate webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "CoinGate webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}


