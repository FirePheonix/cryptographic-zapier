"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { WalletButton } from "./wallet-button";
import { BlockchainCommitButton } from "./blockchain-commit-button";
import { DeployToggleCompact } from "./deploy-toggle-compact";
import { WorkflowMenu } from "./workflow-menu";
import { RunWorkflowButton } from "./run-workflow-button";
import { useWorkflow } from "@/providers/workflow";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck, CheckIcon, Loader2Icon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useSaveProject } from "@/hooks/use-save-project";
import { cn } from "@/lib/utils";

const getFormattedTime = (date: Date | undefined) => {
  if (!date) {
    return "Never";
  }

  let unit: Intl.RelativeTimeFormatUnit = "seconds";
  let value = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteValue = Math.abs(value);

  if (absoluteValue > 60) {
    unit = "minutes";
    value = Math.round(value / 60);
  }

  if (absoluteValue > 3600) {
    unit = "hours";
    value = Math.round(value / 60);
  }

  if (absoluteValue > 86_400) {
    unit = "days";
    value = Math.round(value / 24);
  }

  if (absoluteValue > 604_800) {
    unit = "weeks";
    value = Math.round(value / 7);
  }

  if (absoluteValue > 2_592_000) {
    unit = "months";
    value = Math.round(value / 4);
  }

  if (absoluteValue > 31_536_000) {
    unit = "years";
    value = Math.round(value / 12);
  }

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    value,
    unit
  );
};

interface WorkflowHeaderClientProps {
  workflowSelector: React.ReactNode;
  workflowSettings: React.ReactNode;
  menu: React.ReactNode;
  workflowId: string;
}

export function WorkflowHeaderClient({ 
  workflowSelector, 
  workflowSettings, 
  menu,
  workflowId
}: WorkflowHeaderClientProps) {
  const { connected } = useWallet();
  const workflow = useWorkflow();
  const { getNodes, getEdges } = useReactFlow();
  const [{ isSaving, lastSaved }] = useSaveProject();

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
      className="m-0 flex w-full items-center justify-between gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur-sm"
      position="top-center"
    >
      {/* Left Section: Workflow Selector & Settings */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border bg-background/50 p-1">
          {workflowSelector}
        </div>
        <div className="flex items-center rounded-full border bg-background/50 p-1">
          {workflowSettings}
        </div>
        
        {/* Save Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 rounded-full border bg-background/50 px-3 py-1.5">
              {isSaving ? (
                <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <CheckIcon className="h-4 w-4 shrink-0 text-green-500" />
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isSaving ? "Saving..." : "Saved"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Last saved{" "}
            {getFormattedTime(
              lastSaved ?? workflow?.updatedAt ?? workflow?.createdAt
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Right Section: Run, Deploy, Blockchain, Menu */}
      <div className="flex items-center gap-2">
        {/* Run Workflow Button */}
        <RunWorkflowButton workflowId={workflowId} />

        {/* Deploy Toggle */}
        <DeployToggleCompact />

        {/* Blockchain Section */}
        <div className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium hidden sm:inline">Blockchain</span>
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
                orgId="default-org"
                workflowContent={handleCommit()}
                message={`Commit workflow: ${workflow.name}`}
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Commit</span>
              </BlockchainCommitButton>
            </>
          )}
        </div>

        {/* Menu */}
        <div className="flex items-center rounded-full border bg-background/50 p-1">
          {menu}
        </div>
      </div>
    </Panel>
  );
}
