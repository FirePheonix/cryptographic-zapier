/**
 * CoinGate Provider Adapter
 * 
 * Handles crypto payment processing through CoinGate API
 */

import { BaseProviderAdapter } from "./base";
import type {
  Credentials,
  ExecutionContext,
  NodeExecutionResult,
  OperationId,
  ApiKeyCredentials,
} from "../types";

export type CoingateOperation = "payment.webhook" | "payment.create";

export interface CoingateAdapter extends BaseProviderAdapter {
  providerId: "coingate";
  supportedOperations: CoingateOperation[];
}

/**
 * CoinGate Adapter Implementation
 */
class CoingateAdapterImpl extends BaseProviderAdapter implements CoingateAdapter {
  readonly providerId = "coingate" as const;
  readonly supportedOperations: CoingateOperation[] = [
    "payment.webhook",
    "payment.create",
  ];

  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    if (credentials.type !== "api_key") {
      throw new Error("CoinGate requires API key credentials");
    }

    switch (operation) {
      case "payment.webhook":
        return this.createPaymentOrder(input, credentials, context);
      case "payment.create":
        return this.createPaymentOrder(input, credentials, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Create a payment order and set up webhook
   */
  private async createPaymentOrder(
    input: Record<string, unknown>,
    credentials: ApiKeyCredentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const {
      orderId,
      priceAmount,
      priceCurrency,
      receiveCurrency,
      successUrl,
      cancelUrl,
    } = input;

    // Validate required fields
    if (!priceAmount || typeof priceAmount !== "number") {
      throw new Error("Price amount is required and must be a number");
    }

    if (!priceCurrency || typeof priceCurrency !== "string") {
      throw new Error("Price currency is required");
    }

    if (!receiveCurrency || typeof receiveCurrency !== "string") {
      throw new Error("Receive currency is required");
    }

    // Build webhook callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/coingate?workflowId=${context.workflowId}&executionId=${context.executionId}`;

    // Prepare order payload
    const orderPayload: Record<string, unknown> = {
      price_amount: priceAmount,
      price_currency: priceCurrency,
      receive_currency: receiveCurrency,
      callback_url: callbackUrl,
    };

    // Add optional fields
    if (orderId && typeof orderId === "string") {
      orderPayload.order_id = orderId;
    }

    if (successUrl && typeof successUrl === "string") {
      orderPayload.success_url = successUrl;
    }

    if (cancelUrl && typeof cancelUrl === "string") {
      orderPayload.cancel_url = cancelUrl;
    }

    // Create order via CoinGate API
    const response = await fetch("https://api.coingate.com/v2/orders", {
      method: "POST",
      headers: {
        "Authorization": `Token ${credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CoinGate API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Return structured output
    return {
      id: data.id,
      orderId: data.order_id,
      status: data.status,
      priceAmount: data.price_amount,
      priceCurrency: data.price_currency,
      receiveAmount: data.receive_amount,
      receiveCurrency: data.receive_currency,
      paymentUrl: data.payment_url,
      paymentAddress: data.payment_address,
      token: data.token,
      createdAt: data.created_at,
      expireAt: data.expire_at,
    };
  }

  /**
   * Process webhook callback from CoinGate
   */
  async processWebhook(
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // CoinGate sends webhook data in the payload
    return {
      id: payload.id,
      orderId: payload.order_id,
      status: payload.status,
      priceAmount: payload.price_amount,
      priceCurrency: payload.price_currency,
      receiveAmount: payload.receive_amount,
      receiveCurrency: payload.receive_currency,
      paymentAddress: payload.payment_address,
      token: payload.token,
      webhookReceivedAt: new Date().toISOString(),
    };
  }
}

export const coingateAdapter = new CoingateAdapterImpl();


