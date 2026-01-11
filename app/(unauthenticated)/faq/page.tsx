"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "What blockchains do you support?",
    answer: "Currently, we support Solana, Ethereum, and Polygon. We are actively working on adding support for Arbitrum and Optimism in Q4."
  },
  {
    question: "Is there a free tier?",
    answer: "Yes! Our Starter plan is completely free and includes 100 executions per month, which is perfect for testing and small personal projects."
  },
  {
    question: "How secure are my private keys?",
    answer: "Zynthex never stores your private keys. We use a delegated authorization model where you sign specific permissions for our agents to act on your behalf, without giving up custody of your assets."
  },
  {
    question: "Can I host Zynthex on my own infrastructure?",
    answer: "Yes, we offer a self-hosted Docker container for Enterprise clients who require complete data sovereignty and isolation."
  },
  {
    question: "Do you support custom webhooks?",
    answer: "Absolutely. You can trigger any workflow via a standard REST API call (POST request) and pass arbitrary JSON payloads to be used within your logic."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 font-sans flex flex-col">
      <main className="flex-1 max-w-[800px] w-full mx-auto px-4 md:px-8 py-20">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">
            Everything you need to know about the product and billing.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={faq.question}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isOpen ? "bg-[#0A0A0A] border-[#6E532A]/30" : "bg-[#0A0A0A] border-white/5 hover:border-white/10"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className={cn("font-medium text-lg", isOpen ? "text-white" : "text-gray-300")}>
                    {faq.question}
                  </span>
                  <div className={cn(
                    "p-1 rounded-full border transition-colors",
                    isOpen ? "bg-[#6E532A] border-[#6E532A] text-white" : "border-white/10 text-gray-500"
                  )}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 pt-0 text-gray-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </main>
      <Footer />
    </div>
  );
}