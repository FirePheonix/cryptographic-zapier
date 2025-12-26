import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useState } from "react";
import { createCommitVersionInstruction } from "@/lib/solana/instructions";
import { createHash } from "crypto";

interface CommitToBlockchainParams {
  orgId: string;
  workspaceId: string;
  workflowContent: string;
  parentHash: string;
  message: string;
}

export function useBlockchainCommit() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastCommitHash, setLastCommitHash] = useState<string | null>(null);

  /**
   * Generate SHA-256 hash of workflow content
   */
  const generateContentHash = (content: string): string => {
    return createHash("sha256").update(content).digest("hex").slice(0, 32);
  };

  /**
   * Generate version hash (timestamp + content hash)
   */
  const generateVersionHash = (contentHash: string): string => {
    const timestamp = Date.now().toString();
    return createHash("sha256")
      .update(timestamp + contentHash)
      .digest("hex")
      .slice(0, 32);
  };

  /**
   * Commit workflow version to Solana blockchain
   */
  const commitToBlockchain = async ({
    orgId,
    workspaceId,
    workflowContent,
    parentHash,
    message,
  }: CommitToBlockchainParams) => {
    if (!publicKey) {
      throw new Error("Wallet not connected");
    }

    setIsCommitting(true);

    try {
      // Generate hashes
      const contentHash = generateContentHash(workflowContent);
      const versionHash = generateVersionHash(contentHash);

      // Create commit instruction
      const instruction = createCommitVersionInstruction(
        publicKey,
        orgId,
        workspaceId,
        versionHash,
        contentHash,
        parentHash || "0".repeat(32), // Use zero hash for first commit
        message
      );

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      setLastCommitHash(versionHash);

      return {
        versionHash,
        contentHash,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=testnet`,
      };
    } catch (error) {
      console.error("Blockchain commit failed:", error);
      throw error;
    } finally {
      setIsCommitting(false);
    }
  };

  return {
    commitToBlockchain,
    isCommitting,
    lastCommitHash,
    generateContentHash,
    generateVersionHash,
  };
}
