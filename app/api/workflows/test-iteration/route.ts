/**
 * Test Iteration API
 * 
 * Executes a full iteration loop: Iterator Start → nodes → Iterator End
 * Processes each bundle sequentially, stops on first error
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { database } from "@/lib/database";
import { credentials } from "@/schema";
import { eq } from "drizzle-orm";
import { getProviderAdapter } from "@/lib/engine/adapters";
import { getNodeTypeMapping } from "@/lib/engine/resolver";
import { interpolateConfig } from "@/lib/engine/interpolation";
import type { ExecutionContext, OperationId, ProviderId } from "@/lib/engine/types";

type TestIterationRequest = {
  iteratorNodeId: string;
  iteratorNodeData: Record<string, unknown>;
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
  nodeOutputs?: Array<{
    nodeId: string;
    output: unknown;
  }>;
};

type IterationResult = {
  bundleIndex: number;
  item: unknown;
  nodeResults: Array<{
    nodeId: string;
    nodeType: string;
    success: boolean;
    output?: unknown;
    error?: string;
  }>;
};

// Helper to create mock metadata
const createMockMetadata = () => ({
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  duration: 0,
  retryCount: 0,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TestIterationRequest = await request.json();
    const { iteratorNodeId, iteratorNodeData, nodes, edges, nodeOutputs = [] } = body;

    if (!iteratorNodeId || !iteratorNodeData || !nodes || !edges) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user credentials
    const userCredentials = await database.query.credentials.findMany({
      where: eq(credentials.userId, user.id),
    });

    // Build edge map for traversal
    const edgeMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge.target);
    }

    // Create node lookup
    const nodeMap = new Map<string, typeof nodes[0]>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Find nodes between Iterator Start and Iterator End
    const iterationNodes = getNodesInIteration(iteratorNodeId, edgeMap, nodeMap);

    if (iterationNodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No nodes found between Iterator Start and Iterator End",
      });
    }

    // Create base execution context
    const baseContext: ExecutionContext = {
      workflowId: "test-iteration",
      executionId: `test-iteration-${Date.now()}`,
      userId: user.id,
      triggerInput: {},
      nodeOutputs: new Map(),
      variables: {},
      credentials: new Map(),
    };

    // Populate existing outputs
    for (const nodeOutput of nodeOutputs) {
      baseContext.nodeOutputs.set(nodeOutput.nodeId, {
        success: true,
        output: nodeOutput.output as Record<string, unknown>,
        metadata: createMockMetadata(),
      });
    }

    // Populate credentials
    for (const cred of userCredentials) {
      baseContext.credentials.set(cred.provider as ProviderId, {
        type: (cred.credentials as any)?.type || "oauth2",
        accessToken: (cred.credentials as any)?.accessToken,
        refreshToken: (cred.credentials as any)?.refreshToken,
        expiresAt: (cred.credentials as any)?.expiresAt,
        tokenType: (cred.credentials as any)?.tokenType || "Bearer",
        scope: (cred.credentials as any)?.scope || [],
        apiKey: (cred.credentials as any)?.apiKey,
      });
    }



    // Step 1: Execute the Iterator node to get the items
    const flowAdapter = getProviderAdapter("flow");
    const iteratorResult = await flowAdapter.execute(
      "flow.iterate" as OperationId,
      interpolateConfig(iteratorNodeData, baseContext),
      {} as any, // Empty credentials for flow
      baseContext
    );

    if (!iteratorResult.success || !iteratorResult.output) {
      return NextResponse.json({
        success: false,
        error: iteratorResult.error?.message || "Iterator node failed to produce items",
      });
    }

    // Extract items from iterator output
    const iteratorOutput = iteratorResult.output as Record<string, unknown>;
    const iterationData = iteratorOutput._iterationData as {
      items: unknown[];
      totalItems: number;
    } | undefined;

    if (!iterationData || !Array.isArray(iterationData.items)) {
      return NextResponse.json({
        success: false,
        error: "Iterator did not produce valid iteration data",
      });
    }

    const items = iterationData.items;
    const totalItems = items.length;

    // Store iterator output
    baseContext.nodeOutputs.set(iteratorNodeId, {
      success: true,
      output: iteratorResult.output,
      metadata: createMockMetadata(),
    });

    // Step 2: Iterate through each bundle
    const iterationResults: IterationResult[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      
      // Create a fresh context for this iteration with flow variables
      const iterationContext: ExecutionContext = {
        ...baseContext,
        nodeOutputs: new Map(baseContext.nodeOutputs),
        variables: {
          ...baseContext.variables,
          flow: {
            item,
            index,
            totalItems,
          },
        },
      };

      const bundleResult: IterationResult = {
        bundleIndex: index,
        item,
        nodeResults: [],
      };

      // Execute each node in the iteration in order
      for (const iterNode of iterationNodes) {
        const nodeResult = await executeNodeInIteration(
          iterNode,
          nodeMap,
          iterationContext,
          userCredentials
        );

        bundleResult.nodeResults.push(nodeResult);

        if (!nodeResult.success) {
          // Stop iteration on first error
          iterationResults.push(bundleResult);
          return NextResponse.json({
            success: false,
            error: `Iteration stopped at bundle ${index + 1}/${totalItems}: ${nodeResult.error}`,
            iteratorOutput: iteratorResult.output,
            iterationResults,
            stoppedAt: {
              bundleIndex: index,
              nodeId: iterNode,
              nodeType: nodeMap.get(iterNode)?.type,
            },
          });
        }

        // Store output for next nodes in this iteration
        iterationContext.nodeOutputs.set(iterNode, {
          success: true,
          output: (nodeResult.output ?? {}) as Record<string, unknown>,
          metadata: createMockMetadata(),
        });
      }

      iterationResults.push(bundleResult);
    }

    return NextResponse.json({
      success: true,
      iteratorOutput: iteratorResult.output,
      totalBundles: totalItems,
      iterationResults,
      summary: {
        totalItems,
        processedItems: iterationResults.length,
        allSucceeded: true,
      },
    });

  } catch (error) {
    console.error("Test iteration error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to test iteration" 
      },
      { status: 500 }
    );
  }
}

/**
 * Find all nodes between Iterator Start and Iterator End (or end of chain)
 */
function getNodesInIteration(
  startNodeId: string,
  edgeMap: Map<string, string[]>,
  nodeMap: Map<string, { id: string; type: string; data: Record<string, unknown> }>
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  
  // Start from nodes connected to the iterator
  const nextNodes = edgeMap.get(startNodeId) || [];
  
  const queue = [...nextNodes];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    
    // Check if this is an Iterator End node
    const isEndIterator = 
      node.type === "flow" && 
      (node.data.mode === "endIterator" || node.data.mode === "aggregator");
    
    if (isEndIterator) {
      // Don't include the end iterator in nodes to execute per bundle
      continue;
    }
    
    result.push(nodeId);
    
    // Add downstream nodes
    const downstream = edgeMap.get(nodeId) || [];
    for (const next of downstream) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }
  
  return result;
}

/**
 * Execute a single node within an iteration context
 */
async function executeNodeInIteration(
  nodeId: string,
  nodeMap: Map<string, { id: string; type: string; data: Record<string, unknown> }>,
  context: ExecutionContext,
  userCredentials: any[]
): Promise<{
  nodeId: string;
  nodeType: string;
  success: boolean;
  output?: unknown;
  error?: string;
}> {
  const node = nodeMap.get(nodeId);
  
  if (!node) {
    return {
      nodeId,
      nodeType: "unknown",
      success: false,
      error: `Node ${nodeId} not found`,
    };
  }

  const mapping = getNodeTypeMapping(node.type);
  
  if (!mapping) {
    return {
      nodeId,
      nodeType: node.type,
      success: false,
      error: `Unknown node type: ${node.type}`,
    };
  }

  const adapter = getProviderAdapter(mapping.provider);
  
  // Get credentials for this provider
  let providerCredential = userCredentials.find(c => c.provider === mapping.provider);

  // Skip credential check for certain providers
  const noCredentialProviders = ["transform", "webhook", "flow"];
  if (!providerCredential && !noCredentialProviders.includes(mapping.provider)) {
    return {
      nodeId,
      nodeType: node.type,
      success: false,
      error: `No credentials found for ${mapping.provider}`,
    };
  }

  // Determine operation
  let operation = ((node.data.operation as string) || mapping.operation) as OperationId;
  
  // For flow nodes, use mode
  if (mapping.provider === "flow" && node.data.mode) {
    const mode = node.data.mode as string;
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
    const interpolatedData = interpolateConfig(node.data, context);
    const result = await adapter.execute(
      operation,
      interpolatedData,
      providerCredential?.credentials,
      context
    );

    return {
      nodeId,
      nodeType: node.type,
      success: result.success,
      output: result.output,
      error: result.error?.message,
    };
  } catch (error) {
    return {
      nodeId,
      nodeType: node.type,
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}


