"use client";

import { toast } from "sonner";
import {
  buildInitializeOrgInstruction,
  buildInitializeWorkspaceInstruction,
  buildCreatePullRequestInstruction,
  buildApprovePullRequestInstruction,
  buildMergePullRequestInstruction,
  executeWithPhantom,
  hashContent,
  TESTNET_RPC,
} from "@/lib/solana/transactions";

/**
 * Initialize organization on Solana blockchain
 */
export async function initializeOrgOnChain(orgSlug: string): Promise<string | null> {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      toast.error("Phantom wallet not found. Install Phantom to enable blockchain features.");
      return null;
    }

    toast.info("Initializing organization on blockchain...");
    
    const { publicKey } = await phantom.connect();
    const instruction = buildInitializeOrgInstruction(publicKey, orgSlug);
    
    const result = await executeWithPhantom(instruction, "Initialize Organization");
    
    toast.success(
      <div>
        <p>Organization registered on-chain! ✅</p>
        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
          View transaction
        </a>
      </div>
    );
    
    return result.signature;
  } catch (error: any) {
    console.error("Blockchain org init error:", error);
    if (error?.message?.includes("User rejected") || error?.code === 4001) {
      toast.error("Transaction cancelled");
    } else {
      toast.error("Failed to register org on blockchain (will work off-chain)");
    }
    return null;
  }
}

/**
 * Initialize workspace on Solana blockchain
 */
export async function initializeWorkspaceOnChain(
  orgSlug: string,
  workspaceId: string,
  workspaceName: string
): Promise<string | null> {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      toast.error("Phantom wallet not found");
      return null;
    }

    toast.info("Registering workspace on blockchain...");
    
    const { publicKey } = await phantom.connect();
    const instruction = buildInitializeWorkspaceInstruction(
      publicKey,
      orgSlug,
      workspaceId,
      workspaceName
    );
    
    const result = await executeWithPhantom(instruction, "Initialize Workspace");
    
    toast.success(
      <div>
        <p>Workspace registered on-chain! ✅</p>
        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
          View transaction
        </a>
      </div>
    );
    
    return result.signature;
  } catch (error: any) {
    console.error("Blockchain workspace init error:", error);
    if (error?.message?.includes("User rejected") || error?.code === 4001) {
      toast.error("Transaction cancelled");
    } else {
      toast.error("Failed to register workspace on blockchain");
    }
    return null;
  }
}

/**
 * Create pull request on Solana blockchain
 */
export async function createPROnChain(
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string,
  title: string,
  sourceContent: string,
  targetContent: string
): Promise<string | null> {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      toast.error("Phantom wallet not found");
      return null;
    }

    toast.info("Creating PR on blockchain...");
    
    const { publicKey } = await phantom.connect();
    const instruction = buildCreatePullRequestInstruction(
      publicKey,
      orgSlug,
      sourceWorkspaceId,
      targetWorkspaceId,
      prId,
      title,
      hashContent(sourceContent),
      hashContent(targetContent)
    );
    
    const result = await executeWithPhantom(instruction, "Create Pull Request");
    
    toast.success(
      <div>
        <p>PR created on-chain! ✅</p>
        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
          View transaction
        </a>
      </div>
    );
    
    return result.signature;
  } catch (error: any) {
    console.error("Blockchain PR creation error:", error);
    if (error?.message?.includes("User rejected") || error?.code === 4001) {
      toast.error("Transaction cancelled");
    } else {
      toast.error("Failed to create PR on blockchain");
    }
    return null;
  }
}

/**
 * Approve pull request on Solana blockchain
 */
export async function approvePROnChain(
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string
): Promise<string | null> {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      toast.error("Phantom wallet not found");
      return null;
    }

    toast.info("Recording approval on blockchain...");
    
    const { publicKey } = await phantom.connect();
    const instruction = buildApprovePullRequestInstruction(
      publicKey,
      orgSlug,
      sourceWorkspaceId,
      targetWorkspaceId,
      prId
    );
    
    const result = await executeWithPhantom(instruction, "Approve Pull Request");
    
    toast.success(
      <div>
        <p>Approval recorded on-chain! ✅</p>
        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
          View transaction
        </a>
      </div>
    );
    
    return result.signature;
  } catch (error: any) {
    console.error("Blockchain PR approval error:", error);
    if (error?.message?.includes("User rejected") || error?.code === 4001) {
      toast.error("Transaction cancelled");
    } else {
      toast.error("Failed to record approval on blockchain");
    }
    return null;
  }
}

/**
 * Merge pull request on Solana blockchain
 */
export async function mergePROnChain(
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string,
  mergeContent: string,
  message: string,
  newVersionNumber: number
): Promise<string | null> {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      toast.error("Phantom wallet not found");
      return null;
    }

    toast.info("Recording merge on blockchain...");
    
    const { publicKey } = await phantom.connect();
    const instruction = buildMergePullRequestInstruction(
      publicKey,
      orgSlug,
      sourceWorkspaceId,
      targetWorkspaceId,
      prId,
      hashContent(mergeContent),
      message,
      newVersionNumber
    );
    
    const result = await executeWithPhantom(instruction, "Merge Pull Request");
    
    toast.success(
      <div>
        <p>Merge recorded on-chain! ✅</p>
        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">
          View transaction
        </a>
      </div>
    );
    
    return result.signature;
  } catch (error: any) {
    console.error("Blockchain PR merge error:", error);
    if (error?.message?.includes("User rejected") || error?.code === 4001) {
      toast.error("Transaction cancelled");
    } else {
      toast.error("Failed to record merge on blockchain");
    }
    return null;
  }
}
