/**
 * Alchemy Provider Adapter
 * 
 * Handles blockchain monitoring through Alchemy's API for wallet address tracking
 */

import { BaseProviderAdapter } from "./base";
import type {
  Credentials,
  ExecutionContext,
  NodeExecutionResult,
  OperationId,
  ApiKeyCredentials,
} from "../types";

export type AlchemyOperation = 
  | "alchemy.watchAddress"
  | "alchemy.getTransactions";

export interface AlchemyAdapter extends BaseProviderAdapter {
  providerId: "alchemy";
  supportedOperations: AlchemyOperation[];
}

/**
 * Alchemy Adapter Implementation
 */
class AlchemyAdapterImpl extends BaseProviderAdapter implements AlchemyAdapter {
  readonly providerId = "alchemy" as const;
  readonly supportedOperations: AlchemyOperation[] = [
    "alchemy.watchAddress",
    "alchemy.getTransactions",
  ];

  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    if (credentials.type !== "api_key") {
      throw new Error("Alchemy requires API key credentials");
    }

    switch (operation) {
      case "alchemy.watchAddress":
        return this.watchAddress(input, credentials, context);
      case "alchemy.getTransactions":
        return this.getTransactions(input, credentials, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Set up webhook for watching a blockchain address
   */
  private async watchAddress(
    input: Record<string, unknown>,
    credentials: ApiKeyCredentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const { address, network = "ETH_MAINNET" } = input;

    if (!address || typeof address !== "string") {
      throw new Error("Address is required");
    }

    // Validate address format (basic check)
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid Ethereum address format");
    }

    // Create Alchemy webhook using Notify API
    const response = await fetch("https://dashboard.alchemy.com/api/create-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Alchemy-Token": credentials.apiKey,
      },
      body: JSON.stringify({
        network,
        webhook_type: "ADDRESS_ACTIVITY",
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/alchemy`,
        addresses: [address],
        metadata: {
          userId: context.userId,
          workflowId: context.workflowId,
          nodeId: context.nodeId,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alchemy API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      webhookId: data.id,
      address,
      network,
      status: "active",
      message: `Now watching ${address} on ${network}`,
    };
  }

  /**
   * Get recent transactions for an address
   */
  private async getTransactions(
    input: Record<string, unknown>,
    credentials: ApiKeyCredentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const { address, network = "ETH_MAINNET", limit = 10 } = input;

    if (!address || typeof address !== "string") {
      throw new Error("Address is required");
    }

    // Use Alchemy's eth_getTransactionCount and alchemy_getAssetTransfers
    const baseUrl = this.getNetworkUrl(network as string, credentials.apiKey);
    
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: address,
            category: ["external", "internal", "erc20", "erc721", "erc1155"],
            maxCount: limit,
            order: "desc",
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy RPC error: ${data.error.message}`);
    }

    return {
      address,
      network,
      transactions: data.result?.transfers || [],
      count: data.result?.transfers?.length || 0,
    };
  }

  /**
   * Get the correct Alchemy API URL for the network
   */
  private getNetworkUrl(network: string, apiKey: string): string {
    const networkMap: Record<string, string> = {
      ETH_MAINNET: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      ETH_SEPOLIA: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
      POLYGON_MAINNET: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
      POLYGON_MUMBAI: `https://polygon-mumbai.g.alchemy.com/v2/${apiKey}`,
      ARBITRUM_MAINNET: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
      OPTIMISM_MAINNET: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`,
    };

    return networkMap[network] || networkMap.ETH_MAINNET;
  }
}

// Export singleton instance
export const alchemyAdapter = new AlchemyAdapterImpl();


