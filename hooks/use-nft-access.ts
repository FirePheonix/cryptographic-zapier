"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useCallback, useEffect } from "react";

export interface NFTAccessStatus {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = "zynthex_template_access";

/**
 * Hook to check if user has purchased zynthex Template Access
 * Uses localStorage to persist access after successful payment
 */
export function useNFTAccess() {
  const wallet = useWallet();
  const [status, setStatus] = useState<NFTAccessStatus>({
    hasAccess: false,
    loading: true,
    error: null,
  });

  const checkAccess = useCallback((): boolean => {
    if (!wallet.publicKey) {
      setStatus({
        hasAccess: false,
        loading: false,
        error: null,
      });
      return false;
    }

    try {
      // Check localStorage for this wallet access
      const storedAccess = localStorage.getItem(STORAGE_KEY);
      if (storedAccess) {
        const accessData = JSON.parse(storedAccess);
        const walletKey = wallet.publicKey.toString();
        
        if (accessData[walletKey]) {
          console.log("Template access verified for wallet:", walletKey);
          setStatus({
            hasAccess: true,
            loading: false,
            error: null,
          });
          return true;
        }
      }

      setStatus({
        hasAccess: false,
        loading: false,
        error: null,
      });
      return false;
    } catch (err: any) {
      console.error("Error checking access:", err);
      setStatus({
        hasAccess: false,
        loading: false,
        error: err.message || "Failed to check access",
      });
      return false;
    }
  }, [wallet.publicKey]);

  // Grant access after successful payment
  const grantAccess = useCallback((signature: string) => {
    if (!wallet.publicKey) return;

    try {
      const walletKey = wallet.publicKey.toString();
      const storedAccess = localStorage.getItem(STORAGE_KEY);
      const accessData = storedAccess ? JSON.parse(storedAccess) : {};
      
      accessData[walletKey] = {
        signature,
        grantedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accessData));
      
      setStatus({
        hasAccess: true,
        loading: false,
        error: null,
      });
      
      console.log("Access granted for wallet:", walletKey);
    } catch (err: any) {
      console.error("Error granting access:", err);
    }
  }, [wallet.publicKey]);

  // Check access when wallet changes
  useEffect(() => {
    if (wallet.publicKey) {
      checkAccess();
    } else {
      setStatus({
        hasAccess: false,
        loading: false,
        error: null,
      });
    }
  }, [wallet.publicKey, checkAccess]);

  return {
    ...status,
    grantAccess,
    checkAccess,
  };
}


