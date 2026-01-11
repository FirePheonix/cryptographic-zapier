"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";
import { useMintNFT } from "@/hooks/use-mint-nft";
import { NFT_PRICE_SOL, NFT_METADATA, NETWORK } from "@/lib/solana/nft-config";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Sparkles, Lock } from "lucide-react";

interface NFTPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (signature: string) => void;
}

export function NFTPurchaseModal({
  open,
  onClose,
  onSuccess,
}: NFTPurchaseModalProps) {
  const wallet = useWallet();
  const { mintNFT, loading, error } = useMintNFT();
  const [signature, setSignature] = useState<string | null>(null);

  const handleMint = async () => {
    const result = await mintNFT();
    
    if (result.success && result.signature) {
      setSignature(result.signature);
      onSuccess?.(result.signature);
    }
  };

  const handleClose = () => {
    setSignature(null);
    onClose();
  };

  const explorerUrl = signature
    ? `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-black border border-green-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-green-400">
            <Sparkles className="w-6 h-6" />
            Unlock All Templates
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Get lifetime access to all premium automation templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* NFT Preview */}
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">🧙‍♂️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {NFT_METADATA.name}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {NFT_METADATA.description}
            </p>
            <div className="inline-flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
              <span className="text-2xl font-bold text-green-400">
                {NFT_PRICE_SOL} SOL
              </span>
              <span className="text-sm text-gray-500">(~$20)</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">What you get:</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Unlimited access to all templates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Future templates included (forever)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Priority support & updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Tradeable NFT (sell/transfer anytime)
              </li>
            </ul>
          </div>

          {/* Wallet Connection */}
          {!wallet.connected && (
            <div className="flex flex-col items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Lock className="w-8 h-8 text-yellow-400" />
              <p className="text-sm text-gray-300 text-center">
                Connect your Solana wallet to purchase
              </p>
              <WalletMultiButton className="!bg-green-500 !hover:bg-green-600" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {signature && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                <div className="space-y-2">
                  <p className="font-semibold">NFT minted successfully! 🎉</p>
                  <p className="text-xs text-gray-400">
                    All templates are now unlocked
                  </p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-green-400 hover:text-green-300"
                    >
                      View transaction →
                    </a>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {wallet.connected && !signature && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 border-gray-700 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMint}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Mint NFT ({NFT_PRICE_SOL} SOL)
                  </>
                )}
              </Button>
            </div>
          )}

          {signature && (
            <Button
              onClick={handleClose}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold"
            >
              Start Building →
            </Button>
          )}

          {/* Network Info */}
          <p className="text-xs text-center text-gray-600">
            {NETWORK === "devnet" && "⚠️ Testing on Devnet - "}
            Powered by Solana
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact button to trigger NFT purchase
 */
export function UnlockTemplatesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-black font-bold"
      >
        <Lock className="w-4 h-4 mr-2" />
        Unlock All Templates ({NFT_PRICE_SOL} SOL)
      </Button>

      <NFTPurchaseModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(sig) => {
          console.log("NFT minted:", sig);
          // Could trigger analytics, refresh, etc.
        }}
      />
    </>
  );
}


