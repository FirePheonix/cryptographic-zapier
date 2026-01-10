/**
 * Test Single Node API
 * 
 * Executes a single node with mock/sample data for testing
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { database } from "@/lib/database";
import { credentials } from "@/schema";
import { eq } from "drizzle-orm";
import { getProviderAdapter } from "@/lib/engine/adapters";
import { getNodeTypeMapping } from "@/lib/engine/resolver";
import { interpolateConfig } from "@/lib/engine/interpolation";
import type { ExecutionContext, OperationId } from "@/lib/engine/types";

type TestNodeRequest = {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  testInput?: Record<string, unknown>;
  nodeOutputs?: Array<{
    nodeId: string;
    output: unknown;
  }>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TestNodeRequest = await request.json();
    const { nodeId, nodeType, nodeData, testInput = {}, nodeOutputs = [] } = body;

    if (!nodeId || !nodeType) {
      return NextResponse.json(
        { error: "Missing required fields: nodeId, nodeType" },
        { status: 400 }
      );
    }

    // Get node type mapping
    const mapping = getNodeTypeMapping(nodeType);

    if (!mapping) {
      return NextResponse.json({
        success: false,
        error: `Unknown node type: ${nodeType}. Cannot test this node.`,
      });
    }

    // Get provider adapter
    const adapter = getProviderAdapter(mapping.provider);

    // Get user credentials for this provider
    const userCredentials = await database.query.credentials.findMany({
      where: eq(credentials.userId, user.id),
    });

    let providerCredential = userCredentials.find(c => c.provider === mapping.provider);

    // Allow providers that can use env keys or don't need credentials
    // postgres uses connection string from node data, not stored credentials
    const envKeyProviders = ["openai", "transform", "webhook", "flow", "postgres"];
    if (!providerCredential && !envKeyProviders.includes(mapping.provider)) {
      return NextResponse.json({
        success: false,
        error: `No credentials found for ${mapping.provider}. Please connect your account first.`,
      });
    }

    // Create mock execution context
    const context: ExecutionContext = {
      workflowId: "test",
      executionId: `test-${Date.now()}`,
      userId: user.id,
      triggerInput: testInput,
      nodeOutputs: new Map(),
      variables: {},
      credentials: new Map(),
    };

    // Populate node outputs from previous test runs
    for (const nodeOutput of nodeOutputs) {
      context.nodeOutputs.set(nodeOutput.nodeId, {
        success: true,
        output: nodeOutput.output as Record<string, unknown>,
        metadata: {
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          retryCount: 0,
        },
      });
    }

    // Add credentials to context
    if (providerCredential) {
      context.credentials.set(mapping.provider, {
        type: (providerCredential.credentials as any)?.type || "oauth2",
        accessToken: (providerCredential.credentials as any)?.accessToken,
        refreshToken: (providerCredential.credentials as any)?.refreshToken,
        expiresAt: (providerCredential.credentials as any)?.expiresAt,
        tokenType: (providerCredential.credentials as any)?.tokenType || "Bearer",
        scope: (providerCredential.credentials as any)?.scope || [],
        apiKey: (providerCredential.credentials as any)?.apiKey,
      });
    }

    // Determine operation - for flow nodes, use mode to determine operation
    let operation = ((nodeData.operation as string) || mapping.operation) as OperationId;
    
    // For flow nodes, check the mode to determine the actual operation
    if (mapping.provider === "flow" && nodeData.mode) {
      const mode = nodeData.mode as string;
      const operationMap: Record<string, string> = {
        iterator: "flow.iterate",
        endIterator: "flow.endIterate",
        aggregator: "flow.aggregate",
        router: "flow.route",
        filter: "flow.filter",
      };
      if (operationMap[mode]) {
        operation = operationMap[mode] as OperationId;
      }
    }

    try {
      // Interpolate variables in node data before execution
      const interpolatedData = interpolateConfig(nodeData, context);

      // Execute the node
      const result = await adapter.execute(operation, interpolatedData, providerCredential?.credentials as any, context);

      return NextResponse.json({
        success: result.success,
        output: result.output,
        error: result.error?.message,
        metadata: result.metadata,
      });
    } catch (execError) {
      return NextResponse.json({
        success: false,
        error: execError instanceof Error ? execError.message : "Node execution failed",
      });
    }
  } catch (error) {
    console.error("Test node error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to test node" 
      },
      { status: 500 }
    );
  }
}


