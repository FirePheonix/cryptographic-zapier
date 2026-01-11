"use client";
import { motion } from "motion/react";
import { Wallet, ArrowRight, FileSpreadsheet, Sparkles, Mail, Shield } from "lucide-react";

const workflowSteps = [
  {
    icon: Wallet,
    label: "Trigger",
    title: "Payment Received",
    description: "MetaMask • Phantom • CoinGate",
    color: "#8B5CF6",
  },
  {
    icon: FileSpreadsheet,
    label: "Action",
    title: "Log to Sheets",
    description: "Google Sheets • Excel • Notion",
    color: "#10B981",
  },
  {
    icon: Sparkles,
    label: "AI",
    title: "Generate Email",
    description: "OpenAI • Custom Prompts",
    color: "#F59E0B",
  },
  {
    icon: Mail,
    label: "Action",
    title: "Send Email",
    description: "Gmail • SendGrid • SMTP",
    color: "#3B82F6",
  },
];

const useCases = [
  {
    trigger: "SOL received on Phantom",
    actions: ["Update Airtable", "Send Discord DM", "Unlock content"],
  },
  {
    trigger: "NFT minted on contract",
    actions: ["Add to CRM", "Send welcome email", "Create invoice"],
  },
  {
    trigger: "CoinGate payment confirmed",
    actions: ["Log transaction", "Notify Slack", "Ship order"],
  },
  {
    trigger: "Token transfer detected",
    actions: ["Update dashboard", "Alert team", "Generate report"],
  },
];

export default function PixelShowcase() {
  return (
    <div className="bg-black py-[150px] md:py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_50%)] pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto px-10 md:px-5">
        <motion.h2
          className="text-[4rem] md:text-3xl text-white text-center mb-4 font-bold tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          HOW IT <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">WORKS</span>
        </motion.h2>

        <motion.p
          className="text-center text-xl md:text-base text-[#666] mb-20 md:mb-12 max-w-[700px] mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Build powerful automations in minutes. Connect your crypto payments to any business tool.
        </motion.p>

        {/* Workflow visualization */}
        <motion.div 
          className="relative mb-24 md:mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-0">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center">
                  <motion.div
                    className="relative bg-[#0a0a0a] border border-[#222] rounded-xl p-6 w-[220px] hover:border-white/30 transition-all duration-300 group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <div 
                      className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-medium rounded"
                      style={{ backgroundColor: step.color + '20', color: step.color }}
                    >
                      {step.label}
                    </div>
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: step.color + '15' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: step.color }} />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                    <p className="text-[#666] text-sm">{step.description}</p>
                  </motion.div>
                  
                  {index < workflowSteps.length - 1 && (
                    <motion.div 
                      className="hidden lg:flex items-center px-2"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-8 h-px bg-gradient-to-r from-[#333] to-[#222]" />
                      <ArrowRight className="w-4 h-4 text-[#444]" />
                      <div className="w-8 h-px bg-gradient-to-l from-[#333] to-[#222]" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Optional audit node */}
          <motion.div 
            className="flex justify-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-dashed border-[#333] text-[#555]">
              <Shield className="w-4 h-4" />
              <span className="text-sm">+ Optional: Audit trail with cryptographic proof</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Use cases grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-center text-2xl md:text-xl text-white font-semibold mb-10">
            Popular Automations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#333] transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-purple-400 font-mono text-sm">When:</span>
                  <span className="text-white text-sm">{useCase.trigger}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-mono text-sm">Then:</span>
                  <div className="flex flex-wrap gap-2">
                    {useCase.actions.map((action, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-[#888]"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex justify-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <button className="relative px-10 py-4 text-lg font-semibold tracking-wide text-black bg-white border-none cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] group rounded-lg">
            <span className="relative z-[1]">Start Building Free</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}


