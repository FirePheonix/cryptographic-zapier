"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  return (
    <WalletMultiButton
      style={{
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        borderRadius: "var(--radius)",
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        fontWeight: "500",
        height: "2.5rem",
      }}
    />
  );
}

export function useWalletConnection() {
  const { publicKey, connected, connecting, disconnect } = useWallet();

  return {
    walletAddress: publicKey?.toBase58(),
    isConnected: connected,
    isConnecting: connecting,
    disconnect,
  };
}
