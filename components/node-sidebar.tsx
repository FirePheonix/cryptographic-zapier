"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { useReactFlow } from "@xyflow/react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNodeOperations } from "@/providers/node-operations";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

// All nodes organized by category - matching the image design
const nodeCategories = [
  {
    id: "triggers",
    label: "Triggers",
    nodes: [
      {
        id: "manualTrigger",
        label: "Manual Trigger",
        icon: "/workflow-svgs/start-trigger.svg",
        data: { label: 'When clicking "Execute Workflow"' },
      },
      {
        id: "webhookTrigger",
        label: "Webhook",
        icon: "/workflow-svgs/webhook.svg",
        data: { label: "Webhook Trigger", httpMethod: "POST", responseMode: "onReceived" },
      },
    ],
  },
  {
    id: "wallets",
    label: "Wallets",
    nodes: [
      {
        id: "metamaskWatch",
        label: "Metamask",
        icon: "/workflow-svgs/metamask.svg",
        data: { network: "ETH_GOERLI" },
      },
      {
        id: "phantomWatch",
        label: "Phantom",
        icon: "/workflow-svgs/phantom_wallet.svg",
        data: { network: "SOLANA_DEVNET" },
      },
    ],
  },
  {
    id: "blockchain",
    label: "Blockchain",
    nodes: [
      {
        id: "cronosPayment",
        label: "Cronos",
        icon: "/workflow-svgs/cronos.svg",
        data: { waitForConfirmations: 1, autoRetry: false },
      },
      {
        id: "httpRequest",
        label: "HTTPS",
        icon: "/workflow-svgs/https.svg",
        data: { method: "GET" },
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    nodes: [
      {
        id: "x402Gate",
        label: "x402",
        icon: "/workflow-svgs/x402.svg",
        data: { requiredAmount: "10.0", replayWindowSeconds: 300, allowOverpayment: true },
      },
      {
        id: "coingateWebhook",
        label: "CoinGate",
        icon: "/workflow-svgs/x402.svg",
        data: { priceCurrency: "USD", receiveCurrency: "BTC" },
      },
    ],
  },
  {
    id: "ai",
    label: "AI",
    nodes: [
      {
        id: "aiAgent",
        label: "AI Agent",
        icon: "/workflow-svgs/agent.svg",
        data: { 
          systemPrompt: "You are a helpful AI assistant.\nUse tools when needed to fetch data.\nNever hallucinate information.",
          maxIterations: 10,
        },
      },
      {
        id: "openai",
        label: "OpenAI",
        icon: "/workflow-svgs/openai.svg",
        data: { model: "gpt-4o-mini" },
      },
      {
        id: "anthropic",
        label: "Anthropic",
        icon: "/workflow-svgs/anthropic.svg",
        data: { model: "claude-3-sonnet" },
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    nodes: [
      {
        id: "googleSheets",
        label: "Sheets",
        icon: "/workflow-svgs/sheets.svg",
        data: { operation: "sheets.appendRow" },
      },
      {
        id: "gmail",
        label: "Mail",
        icon: "/workflow-svgs/gmail.svg",
        data: { operation: "gmail.send" },
      },
      {
        id: "airtable",
        label: "Airtable",
        icon: "/workflow-svgs/airtable.svg",
        data: { operation: "airtable.create" },
      },
      {
        id: "slack",
        label: "Slack",
        icon: "/workflow-svgs/slack.svg",
        data: { operation: "slack.send" },
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    nodes: [
      {
        id: "postgres",
        label: "Postgres",
        icon: "/workflow-svgs/postgress_database.svg",
        data: { operation: "postgres.query" },
      },
      {
        id: "flow",
        label: "Iterator",
        icon: "/workflow-svgs/iterator.svg",
        data: { mode: "iterator" },
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    nodes: [
      {
        id: "respondToWebhook",
        label: "Respond Webhook",
        icon: "/workflow-svgs/webhook.svg",
        data: { label: "Respond to Webhook", statusCode: 200, contentType: "application/json", respondWith: "allInputs" },
      },
      {
        id: "httpResponse",
        label: "HTTP Response",
        icon: "/workflow-svgs/https.svg",
        data: { statusCode: 200, contentType: "application/json" },
      },
      {
        id: "transform",
        label: "Transform",
        icon: "/workflow-svgs/branch.svg",
        data: { operation: "transform.jsonParse" },
      },
      {
        id: "blockchainAudit",
        label: "Audit",
        icon: "/workflow-svgs/policy.svg",
        data: { includeTimestamp: true, includeWorkflowId: true, includeExecutionId: true, includePaymentProof: true, attachToResponse: true },
      },
    ],
  },
];

interface NodeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const NodeSidebar = memo(({ isOpen, onClose, position }: NodeSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { getViewport, screenToFlowPosition } = useReactFlow();
  const { addNode } = useNodeOperations();

  const handleAddNode = (nodeType: string, nodeData?: Record<string, unknown>) => {
    let nodePosition: { x: number; y: number };
    
    if (position) {
      // Use the right-click position if available
      nodePosition = screenToFlowPosition({ x: position.x, y: position.y });
    } else {
      // Otherwise center in viewport
      const viewport = getViewport();
      nodePosition = {
        x: -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom,
        y: -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom,
      };
    }

    addNode(nodeType, {
      position: nodePosition,
      data: nodeData || {},
    });

    onClose();
  };

  // Filter nodes based on search
  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.nodes.length > 0);

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] z-50",
        "flex flex-col shadow-2xl overflow-hidden",
        "animate-in slide-in-from-left-full duration-200"
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-white/90">Add Node</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 p-3 border-b border-[#2a2a2a]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#252525] border-[#333] text-white placeholder:text-white/40 h-9"
          />
        </div>
      </div>

      {/* Node Grid - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-6 pb-6">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              {/* Category nodes as 2-column grid */}
              <div className="grid grid-cols-2 gap-2">
                {category.nodes.map((node) => (
                  <button
                    key={`${category.id}-${node.id}`}
                    onClick={() => handleAddNode(node.id, node.data)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg",
                      "bg-[#252525] border border-[#333]",
                      "hover:bg-[#2a2a2a] hover:border-[#444] transition-all",
                      "cursor-pointer group"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                      <Image
                        src={node.icon}
                        alt={node.label}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs text-white/70 group-hover:text-white/90 transition-colors">
                      {node.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </ScrollArea>
      </div>
    </div>
  );
});

NodeSidebar.displayName = "NodeSidebar";
