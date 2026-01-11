"use client";

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "@/components/landing/Footer/index";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "Perfect for experimenting with on-chain automation.",
    features: [
      "5 Active Workflows",
      "100 Executions / mo",
      "Standard Webhooks",
      "Community Support",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For builders needing reliability and scale.",
    features: [
      "Unlimited Workflows",
      "10,000 Executions / mo",
      "Premium Integrations (Slack, OpenAI)",
      "15-minute sync frequency",
      "Priority Email Support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Dedicated infrastructure for high-volume dApps.",
    features: [
      "Dedicated Nodes",
      "Unlimited Executions",
      "Sub-second latency",
      "Custom SLAs",
      "24/7 Dedicated Support",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 font-sans flex flex-col">
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-20">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400 text-lg">
            Choose the capacity that fits your automation needs. No hidden gas fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div 
              key={plan.name}
              className={cn(
                "relative rounded-3xl p-8 flex flex-col transition-all duration-300",
                plan.highlight 
                  ? "bg-[#0A0A0A] border border-[#6E532A] shadow-[0_0_40px_-10px_rgba(110,83,42,0.15)]" 
                  : "bg-[#0A0A0A] border border-white/5 hover:border-white/10"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#6E532A] text-white text-xs font-bold uppercase tracking-wider rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-400 mt-4">{plan.description}</p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                    <Check className="w-5 h-5 text-[#6E532A] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full font-semibold h-12 rounded-xl transition-all",
                  plan.highlight 
                    ? "bg-[#6E532A] hover:bg-[#5a4321] text-white" 
                    : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                )}
              >
                {plan.price === "Custom" ? "Contact Sales" : "Select Plan"}
              </Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}