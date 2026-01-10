/**
 * Server-Sent Events (SSE) Endpoint for Real-Time Workflow Updates
 * 
 * This endpoint provides real-time streaming of workflow execution events,
 * including agent thinking, tool calls, and node completions.
 * 
 * Usage: EventSource("/api/workflows/{workflowId}/events")
 */

import { NextRequest } from "next/server";
import { setBroadcastFunction } from "@/lib/broadcast";

// Store active SSE connections per workflow
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Register the broadcast function to send events to all connected clients
setBroadcastFunction((workflowId: string, event: any) => {
  const workflowConnections = connections.get(workflowId);
  if (!workflowConnections) return;
  
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params;
  
  // Create a new readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the workflow's connection set
      if (!connections.has(workflowId)) {
        connections.set(workflowId, new Set());
      }
      connections.get(workflowId)!.add(controller);
      
      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", workflowId })}\n\n`));
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        const workflowConns = connections.get(workflowId);
        if (workflowConns) {
          workflowConns.delete(controller);
          if (workflowConns.size === 0) {
            connections.delete(workflowId);
          }
        }
      });
    },
    cancel() {
      // Stream was cancelled by client
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
