/**
 * Server-Sent Events for workflow updates
 * 
 * Sends real-time updates to the frontend when:
 * - Webhook is received
 * - Node execution completes
 * - Workflow execution completes
 * - Agent thinking/tool calls (real-time agent execution)
 */

import { NextRequest } from "next/server";
import { setBroadcastFunction } from "@/lib/broadcast";

// Store active connections per workflow
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Register the broadcast function to send events to all connected clients
// This allows the agent adapter and other parts of the engine to broadcast events
setBroadcastFunction((workflowId: string, event: any) => {
  const workflowConnections = connections.get(workflowId);
  if (!workflowConnections || workflowConnections.size === 0) {
    return;
  }
  
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  
  // Send to all connected clients for this workflow
  for (const controller of workflowConnections) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Connection closed, remove it
      workflowConnections.delete(controller);
    }
  }
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      // Add this controller to the workflow's connections
      if (!connections.has(workflowId)) {
        connections.set(workflowId, new Set());
      }
      connections.get(workflowId)!.add(controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", workflowId })}\n\n`));

      console.log(`📡 SSE: Client connected to workflow ${workflowId}`);
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      // Store interval for cleanup
      (controller as any)._heartbeatInterval = heartbeatInterval;
    },
    cancel(controller) {
      // Clear heartbeat interval
      if ((controller as any)._heartbeatInterval) {
        clearInterval((controller as any)._heartbeatInterval);
      }
      
      // Remove this controller when the connection closes
      const workflowConnections = connections.get(workflowId);
      if (workflowConnections) {
        workflowConnections.delete(controller);
        if (workflowConnections.size === 0) {
          connections.delete(workflowId);
        }
      }
      console.log(`📡 SSE: Client disconnected from workflow ${workflowId}`);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Broadcast an event to all clients watching a workflow
 */
export function broadcastToWorkflow(workflowId: string, event: any) {
  const workflowConnections = connections.get(workflowId);
  if (!workflowConnections || workflowConnections.size === 0) {
    console.log(`📡 SSE: No clients connected for workflow ${workflowId}`);
    return;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  console.log(`📡 SSE: Broadcasting to ${workflowConnections.size} client(s)`);

  for (const controller of workflowConnections) {
    try {
      controller.enqueue(data);
    } catch (error) {
      // Connection may have closed
      workflowConnections.delete(controller);
    }
  }
}

// Export the connections map for other modules to broadcast
export { connections };
