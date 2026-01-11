"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useState, useCallback } from "react";
import {
  NFT_PROGRAM_ID,
  TREASURY_WALLET,
  NFT_PRICE_LAMPORTS,
} from "@/lib/solana/nft-config";

export interface MintNFTResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export function useMintNFT() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintNFT = useCallback(async (): Promise<MintNFTResult> => {
    setLoading(true);
    setError(null);

    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Please connect your wallet first");
      }

      const balance = await connection.getBalance(wallet.publicKey);
      const requiredBalance = NFT_PRICE_LAMPORTS + 10_000_000;
      
      if (balance < requiredBalance) {
        throw new Error(
          `Insufficient balance. Need ${requiredBalance / 1e9} SOL, you have ${balance / 1e9} SOL`
        );
      }

      console.log(" Starting payment...");
      const priceBuffer = Buffer.alloc(8);
      priceBuffer.writeBigUInt64LE(BigInt(NFT_PRICE_LAMPORTS), 0);

      const instruction = new TransactionInstruction({
        programId: NFT_PROGRAM_ID,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: priceBuffer,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      console.log(" Payment successful!");
      setLoading(false);
      return { success: true, signature };
    } catch (err: any) {
      console.error(" Failed:", err);
      setError(err.message || "Payment failed");
      setLoading(false);
      return { success: false, error: err.message || "Payment failed" };
    }
  }, [connection, wallet]);

  return { mintNFT, loading, error };
}


