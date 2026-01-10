import type { Metadata } from "next";
import Home from "./(unauthenticated)/home/page";

export const metadata: Metadata = {
  title: "Zynthex | AI Automation for Crypto Payments",
  description:
    "Automate your crypto payment workflows with AI. Monitor Solana wallets, process transactions with AI, and trigger actions automatically.",
  icons: {
    icon: "/icon.ico",
  },
};

const Index = () => {
  // Always show the landing page regardless of auth status
  // The "Get Started" button handles navigation based on auth state
  return <Home />;
};

export default Index;


