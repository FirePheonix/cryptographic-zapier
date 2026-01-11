"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { WalletButton } from "./wallet-button";
import { BlockchainCommitButton } from "./blockchain-commit-button";
import { DeployToggle } from "./deploy-toggle";
import { WorkflowMenu } from "./workflow-menu";
import { useWorkflow } from "@/providers/workflow";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function BlockchainToolbar() {
  const { connected } = useWallet();
  const workflow = useWorkflow();
  const { getNodes, getEdges } = useReactFlow();

  if (!workflow) return null;

  const handleCommit = () => {
    const nodes = getNodes();
    const edges = getEdges();

    const workflowContent = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type || "unknown",
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      name: workflow.name,
      description: workflow.description,
    };

    return workflowContent;
  };

  return (
    <Panel
      className="m-4 flex items-center gap-3"
      position="top-right"
    >
      {/* Deploy Toggle */}
      <DeployToggle />

      {/* Blockchain Section */}
      <div className="flex items-center gap-2 rounded-full border bg-card/90 px-3 py-2 drop-shadow-xs backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium">Blockchain</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Cryptographic proof on Solana
        </TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border" />

      <WalletButton />

      {connected && (
        <>
          <div className="h-4 w-px bg-border" />
          <BlockchainCommitButton
            workspaceId={workflow.id}
            orgId="default-org" // TODO: Get from actual org context
            workflowContent={handleCommit()}
            message={`Commit workflow: ${workflow.name}`}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Commit
          </BlockchainCommitButton>
        </>
      )}
      </div>

      {/* Workflow Menu */}
      <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <WorkflowMenu />
      </div>
    </Panel>
  );
}


