"use client";

import React from "react";
import { motion } from "motion/react";
import { 
  Bot, 
  Shield, 
  Zap, 
  Wallet, 
  Cpu, 
  Globe
} from "lucide-react";
import LandingFooter from "@/components/landing/Footer";
import Header from "@/components/landing/Header";

const features = [
  {
    title: "AI-Powered Agents",
    description: "Deploy intelligent nodes that analyze transaction data and generate natural language responses using GPT-4.",
    icon: <Bot className="w-8 h-8 text-[#6E532A]" />,
  },
  {
    title: "Immutable Audit Trails",
    description: "Every workflow execution and change is anchored to the Solana blockchain for verifiable transparency.",
    icon: <Shield className="w-8 h-8 text-[#6E532A]" />,
  },
  {
    title: "Real-time Triggers",
    description: "React instantly to on-chain movements across Solana, Ethereum, and Polygon using Helius and Alchemy webhooks.",
    icon: <Zap className="w-8 h-8 text-[#6E532A]" />,
  },
  {
    title: "Multi-Wallet Support",
    description: "Seamlessly integrate with Phantom, MetaMask, and institutional gateways for monitoring and execution.",
    icon: <Wallet className="w-8 h-8 text-[#6E532A]" />,
  },
  {
    title: "Logic & Transformation",
    description: "Execute custom JavaScript/TypeScript for deep data manipulation within your visual workflows.",
    icon: <Cpu className="w-8 h-8 text-[#6E532A]" />,
  },
  {
    title: "Deep Integrations",
    description: "Connect your crypto operations to Gmail, Google Sheets, Slack, and Stripe with native OAuth nodes.",
    icon: <Globe className="w-8 h-8 text-[#6E532A]" />,
  },
];

export default function FeaturesPage() {
  return (
    <div id="features-page" className="w-full bg-black text-white selection:bg-[#6E532A]/30">
      <Header />

      <section className="pt-48 pb-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 rounded-[32px] bg-neutral-900/50 border border-white/5 hover:border-[#6E532A]/50 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#6E532A]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}