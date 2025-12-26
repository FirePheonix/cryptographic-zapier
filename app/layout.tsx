import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { mono, sans, serif } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { PostHogProvider } from "@/providers/posthog-provider";
import { ThemeProvider } from "@/providers/theme";
import { SolanaWalletProvider } from "@/providers/solana-wallet";

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={cn(
        sans.variable,
        serif.variable,
        mono.variable,
        "bg-background text-foreground antialiased"
      )}
    >
      <PostHogProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <SolanaWalletProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster className="z-[99999999]" />
          </SolanaWalletProvider>
        </ThemeProvider>
        <Analytics />
      </PostHogProvider>
    </body>
  </html>
);

export default RootLayout;
