import { PublicKey } from "@solana/web3.js";

/**
 * zynthex NFT Template Access Configuration
 * 
 * Smart contract deployed on Solana Devnet via Solana Playground
 * Program ID: 85zC9Yhgignumh29dhD8nSVet5f5e9sHx1JmdyjQ9EYJ
 */

// NFT Program ID (deployed on devnet)
export const NFT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_NFT_PROGRAM_ID || "5nSGjeWo3H85QAime5VZUMJkg3n7vx2qMHnAgdQ3SrGX"
);

// Treasury wallet (receives NFT sale payments)
export const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || "4qJJKo65RJn1kNNxzzaNEHkii7gag4n975dKoscih658"
);

// Network configuration
export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as "devnet" | "testnet" | "mainnet-beta";

// RPC endpoint
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// NFT Pricing
export const NFT_PRICE_SOL = 0.2; // $20 worth in SOL
export const NFT_PRICE_LAMPORTS = NFT_PRICE_SOL * 1_000_000_000; // 200,000,000 lamports

// NFT Metadata
export const NFT_METADATA = {
  name: "zynthex All Access Pass",
  symbol: "VFAA",
  description: "Unlock all premium automation templates. AI-powered crypto payment workflows.",
  // This should be hosted at your domain
  uri: process.env.NEXT_PUBLIC_NFT_METADATA_URI || "https://zynthex.com/api/nft/metadata.json",
} as const;

// Token Program IDs (Solana SPL)
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

// Instruction discriminators (matching Rust enum)
export enum NFTInstruction {
  MintNFT = 0,
  VerifyAccess = 1,
}


