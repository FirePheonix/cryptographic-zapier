"use client";

import { useNFTAccess } from "@/hooks/use-nft-access";
import { UnlockTemplatesButton } from "@/components/nft-purchase-modal";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Lock, Loader2 } from "lucide-react";

/**
 * Banner shown on templates page to promote NFT purchase
 * Shows different states:
 * - Not connected: Connect wallet prompt
 * - No NFT: Purchase prompt
 * - Has NFT: Access confirmed
 * - Loading: Checking...
 */
export function TemplateAccessBanner() {
  const wallet = useWallet();
  const { hasAccess, loading } = useNFTAccess();

  // Don't show anything while loading
  if (loading) {
    return (
      <div className="px-6 py-3 bg-muted/50">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking template access...
        </div>
      </div>
    );
  }

  // User has NFT - show success message
  if (wallet.connected && hasAccess) {
    return (
      <div className="px-6 py-3 bg-muted/50">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking template access...
        </div>
      </div>
    );
  }

  // User has NFT - show success message
  if (wallet.connected && hasAccess) {
    return (
      <Alert className="mx-6 my-4 bg-green-500/10 border-green-500/30">
        <Sparkles className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-400 flex items-center justify-between">
          <span>
            <strong>All Access Unlocked!</strong> You have full access to all
            templates 🎉
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Wallet not connected
  if (!wallet.connected) {
    return (
      <Alert className="mx-6 my-4 bg-blue-500/10 border-blue-500/30">
        <Lock className="h-4 w-4 text-blue-400" />
        <AlertDescription className="flex items-center justify-between">
          <div className="text-blue-300">
            <strong>Connect Wallet</strong> to unlock premium templates
          </div>
          <WalletMultiButton className="!bg-blue-500 !hover:bg-blue-600 !h-8 !text-sm" />
        </AlertDescription>
      </Alert>
    );
  }

  // Wallet connected but no NFT
  return (
    <Alert className="mx-6 my-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
      <Sparkles className="h-4 w-4 text-green-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-green-300">
          <strong>Unlock All Templates</strong> - One-time purchase, lifetime
          access
        </div>
        <UnlockTemplatesButton />
      </AlertDescription>
    </Alert>
  );
}


