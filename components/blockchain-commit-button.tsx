"use client";

import { useBlockchainCommit } from "@/hooks/use-blockchain-commit";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BlockchainCommitButtonProps {
  workspaceId: string;
  orgId: string;
  workflowContent: any;
  parentHash?: string;
  message: string;
  onSuccess?: (result: { versionHash: string; contentHash: string; signature: string }) => void;
  children?: React.ReactNode;
}

export function BlockchainCommitButton({
  workspaceId,
  orgId,
  workflowContent,
  parentHash = "",
  message,
  onSuccess,
  children,
}: BlockchainCommitButtonProps) {
  const { connected } = useWallet();
  const { commitToBlockchain, isCommitting } = useBlockchainCommit();
  const [lastTxUrl, setLastTxUrl] = useState<string>("");

  const handleCommit = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      toast.info("Committing to blockchain...");
      
      const result = await commitToBlockchain({
        orgId,
        workspaceId,
        workflowContent: JSON.stringify(workflowContent),
        parentHash,
        message,
      });

      setLastTxUrl(result.explorerUrl);
      
      toast.success(
        <div>
          <p>Committed to blockchain! ✅</p>
          <a 
            href={result.explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 underline text-xs"
          >
            View transaction
          </a>
        </div>
      );

      onSuccess?.(result);
    } catch (error) {
      console.error("Blockchain commit error:", error);
      toast.error("Failed to commit to blockchain");
    }
  };

  return (
    <Button 
      onClick={handleCommit} 
      disabled={!connected || isCommitting}
      variant="outline"
      size="sm"
    >
      {isCommitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Committing...
        </>
      ) : (
        children || "Commit to Blockchain"
      )}
    </Button>
  );
}
