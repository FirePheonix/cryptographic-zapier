"use client";
import { motion } from "motion/react";
import { Wallet, Workflow, Plug, ShieldCheck, Zap, Globe, Link2, Bot, Coins, FileCode, Search } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import Image from "next/image";

const features = [
  {
    icon: Coins,
    title: "Flow based Automations for Crypto Payments",
    description: "Accept crypto payments with built-in verification and instant settlement.",
    size: "md:col-span-1 md:row-span-2",
    bgImage: "/features-svgs/x402-protocol-integration.svg",
  },
  {
    icon: Wallet,
    title: "Multi-Wallet Support",
    description: "Connect MetaMask, Phantom, and other popular wallets seamlessly.",
    size: "md:col-span-1",
    bgImage: "/features-svgs/multi-wallet-support.svg",
  },
  {
    icon: Bot,
    title: "AI-Powered Automations",
    description: "Let AI handle your payment workflows. Smart triggers, intelligent routing, and automated responses.",
    size: "md:col-span-1",
    bgImage: "/features-svgs/ai-powered-automations.svg",
  },
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description: "Drag-and-drop interface to create complex automation flows without writing code.",
    size: "md:col-span-1 md:row-span-2",
    bgImage: "/features-svgs/visual-workflow-builder.svg",
  },
  {
    icon: Link2,
    title: "AI Automated Chain Native",
    description: "Built for Crypto ecosystem with optimized gas fees and fast finality.",
    size: "md:col-span-1",
    bgImage: "/features-svgs/cronos-chain-native.svg",
  },
  {
    icon: ShieldCheck,
    title: "Real-Time Triggers",
    description: "Instant webhook notifications when payments are received. Never miss a transaction.",
    size: "md:col-span-1",
    bgImage: "/features-svgs/real-time-triggers.svg",
  },
  {
    icon: Plug,
    title: "50+ Integrations",
    description: "Connect to Google Sheets, Discord, Slack, Telegram, and more. Automate your entire stack.",
    size: "md:col-span-1",
    bgImage: "/features-svgs/50-integrations.svg",
  },
];

export default function Features() {
  return (
    <section className="w-full bg-black px-4 py-20 md:px-8">
      <div className="w-full max-w-[1400px] mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className={`relative rounded-2xl border border-[#222] bg-[#0a0a0a] p-6 md:p-8 overflow-hidden ${feature.size}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                {/* Background SVG */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <Image
                    src={feature.bgImage}
                    alt=""
                    fill
                    className="object-cover object-center"
                  />
                </div>
                {/* removed gradient ray */}
                <div className="pointer-events-none" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-lg border border-[#333] bg-[#111] flex items-center justify-center mb-6">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


