"use client";

import { X, ChevronRight } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type NodeDetailsPanelProps = {
  selectedNodeId: string | null;
  onClose: () => void;
  nodeOutputs?: Record<string, any>;
};

export const NodeDetailsPanel = ({
  selectedNodeId,
  onClose,
  nodeOutputs = {},
}: NodeDetailsPanelProps) => {
  const { getNode, getEdges } = useReactFlow();

  if (!selectedNodeId) return null;

  const node = getNode(selectedNodeId);
  if (!node) return null;

  const edges = getEdges();
  const incomingEdges = edges.filter((e) => e.target === selectedNodeId);
  const outgoingEdges = edges.filter((e) => e.source === selectedNodeId);

  // Get outputs from connected nodes
  const inputData: Record<string, any> = {};
  incomingEdges.forEach((edge) => {
    const sourceNode = getNode(edge.source);
    if (sourceNode) {
      // Check for lastOutput in node data (from webhook triggers)
      const sourceOutput = sourceNode.data?.lastOutput || nodeOutputs[edge.source];
      if (sourceOutput) {
        inputData[sourceNode.id] = {
          nodeName: sourceNode.data.label || sourceNode.type,
          output: sourceOutput,
        };
      }
    }
  });

  // Get output data - check node's lastOutput first, then nodeOutputs
  const outputData = node.data?.lastOutput || nodeOutputs[selectedNodeId];

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{node.data.label || node.type}</div>
          <Badge variant="secondary" className="text-xs">
            {node.type}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="input" className="w-full">
          <TabsList className="w-full grid grid-cols-2 sticky top-0 bg-background z-10">
            <TabsTrigger value="input">
              Input
              {Object.keys(inputData).length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {Object.keys(inputData).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="output">
              Output
              {outputData && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="p-4 space-y-4">
            {Object.keys(inputData).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No input data available
                <p className="text-xs mt-2">
                  Connect this node to other nodes to see their outputs
                </p>
              </div>
            ) : (
              <>
                {Object.entries(inputData).map(([nodeId, data]) => (
                  <div key={nodeId} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ChevronRight className="h-4 w-4" />
                      {data.nodeName}
                    </div>
                    <div className="ml-6 bg-muted rounded-md p-3">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(data.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* Output Tab */}
          <TabsContent value="output" className="p-4">
            {!outputData ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No output data yet
                <p className="text-xs mt-2">
                  Execute this node to see the output
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show key fields in a nice format */}
                {outputData.amount !== undefined && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="text-lg font-bold text-green-500">{outputData.amount} SOL</div>
                  </div>
                )}
                {outputData.from && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">From</div>
                    <code className="text-xs font-mono break-all">{outputData.from}</code>
                  </div>
                )}
                {outputData.to && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">To</div>
                    <code className="text-xs font-mono break-all">{outputData.to}</code>
                  </div>
                )}
                {outputData.signature && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Signature</div>
                    <code className="text-xs font-mono break-all">{outputData.signature}</code>
                  </div>
                )}
                {outputData.timestamp && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                    <div className="text-sm">{new Date(outputData.timestamp).toLocaleString()}</div>
                  </div>
                )}
                {/* Raw JSON Toggle */}
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View Raw JSON
                  </summary>
                  <div className="bg-muted rounded-md p-3 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(outputData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};


