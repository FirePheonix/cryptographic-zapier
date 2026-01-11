"use client";

import React from "react";
import { motion } from "motion/react";
import { Wallet, Zap, Box } from "lucide-react";
import Footer from "@/components/landing/Footer/index";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 1,
    title: "Define Your Trigger",
    description: "Connect to Solana mainnet or devnet. Listen for specific wallet transactions, program logs, or NFT mints in real-time.",
    icon: Wallet,
  },
  {
    id: 2,
    title: "Process with AI",
    description: "Use our integrated Gemini-powered nodes to analyze transaction metadata, verify conditions, or transform data formats dynamically.",
    icon: Box,
  },
  {
    id: 3,
    title: "Execute Actions",
    description: "Trigger automated responses: send Discord alerts, update databases, or execute counter-transactions on-chain.",
    icon: Zap,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 flex flex-col pt-20">
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            How Zynthex Works
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A seamless bridge between blockchain events and automated intelligence.
          </p>
        </div>

        <div className="relative">
          {/* Vertical Progress Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[1px] bg-[#6E532A]/20 -translate-x-1/2 hidden md:block" />

          <div className="space-y-32">
            {STEPS.map((step, index) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-12",
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                )}
              >
                <div className="flex-1 space-y-4 text-center md:text-left">
                   <span className="text-[#6E532A] font-mono text-sm font-bold tracking-widest uppercase">Phase 0{step.id}</span>
                   <h3 className="text-3xl font-bold text-white">{step.title}</h3>
                   <p className="text-gray-400 leading-relaxed text-lg">{step.description}</p>
                </div>

                <div className="relative z-10 shrink-0">
                  <div className="w-20 h-20 rounded-3xl bg-[#0a0a0a] border border-[#6E532A]/40 flex items-center justify-center shadow-[0_0_50px_-10px_rgba(110,83,42,0.4)]">
                    <step.icon className="w-10 h-10 text-[#6E532A]" />
                  </div>
                </div>

                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}