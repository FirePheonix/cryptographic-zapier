"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, 
  Play, 
  Wallet, 
  MessageSquare, 
  Database,
  Loader2,
  Terminal,
  ChevronRight,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "@/components/landing/Footer";

// --- Mock Data ---
const SIMULATION_STEPS = [
  {
    id: "trigger",
    title: "Payment Received",
    icon: Wallet,
    description: "Listening for USDC on Solana",
    status: "idle", 
  },
  {
    id: "logic",
    title: "Verify Amount",
    icon: Database,
    description: "Check if amount > $1000",
    status: "idle",
  },
  {
    id: "action",
    title: "Notify Team",
    icon: MessageSquare,
    description: "Send alert to Slack #sales",
    status: "idle",
  },
];

export default function DemoPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState(SIMULATION_STEPS);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const PRIMARY_COLOR = "#6E532A"; 

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs(["Initializing workflow execution..."]);
    
    // Reset
    setSteps(SIMULATION_STEPS.map(s => ({ ...s, status: "idle" })));

    // Step 1: Trigger
    await delay(800);
    updateStepStatus("trigger", "active");
    addLog("Event detected: 5000 USDC received from 8x...F2a");
    
    await delay(1500);
    updateStepStatus("trigger", "success");
    
    // Step 2: Logic
    await delay(500);
    updateStepStatus("logic", "active");
    addLog("Executing logic: Verify Amount > 1000");
    
    await delay(1500);
    updateStepStatus("logic", "success");
    addLog("Condition met: 5000 > 1000. Proceeding to True branch.");

    // Step 3: Action
    await delay(500);
    updateStepStatus("action", "active");
    addLog("Action: Sending Slack notification...");
    
    await delay(1500);
    updateStepStatus("action", "success");
    addLog("Workflow completed successfully. Transaction hash: 5Yk...9zX");
    
    setIsRunning(false);
  };

  const updateStepStatus = (id: string, status: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 font-sans flex flex-col">
      
      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Workflow Canvas (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Toolbar */}
          <div className="flex items-center justify-between">
             <div className="space-y-1">
               <h2 className="text-2xl font-bold flex items-center gap-2">
                 Workflow Visualizer
               </h2>
               <p className="text-sm text-gray-500">Simulate a payment automation flow in real-time.</p>
             </div>
             
             <Button 
               onClick={runSimulation} 
               disabled={isRunning}
               className={cn(
                 "bg-[#6E532A] hover:bg-[#5a4321] text-white border-0 transition-all font-semibold",
                 isRunning && "opacity-80 cursor-wait"
               )}
             >
               {isRunning ? (
                 <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
               ) : (
                 <><Play className="w-4 h-4 mr-2 fill-current" /> Run Simulation</>
               )}
             </Button>
          </div>

          {/* Canvas Area */}
          <div className="relative flex-1 min-h-[600px] rounded-3xl bg-[#0A0A0A] p-8 md:p-12 overflow-hidden flex flex-col items-center justify-start pt-20 gap-0 shadow-2xl">
            
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                   backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`,
                   backgroundSize: '40px 40px' 
                 }} 
            />
            
            {/* Workflow Nodes Rendered Vertically */}
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                
                {/* Connector Lines */}
                {index > 0 && (
                  <div className="relative h-16 w-[2px] bg-white/5 my-0">
                     {/* Animated Flow Line */}
                     <motion.div 
                        className="absolute inset-0 w-full bg-[#6E532A] origin-top"
                        initial={{ scaleY: 0 }}
                        animate={{ 
                          scaleY: step.status !== 'idle' ? 1 : 0 
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                     />
                  </div>
                )}

                {/* Node Card */}
                <motion.div 
                  className={cn(
                    "relative w-full max-w-[400px] rounded-2xl p-5 z-10 transition-all duration-500 group cursor-default",
                    // Subtle background distinction only
                    step.status === 'active' || step.status === 'success' 
                      ? "bg-[#141414]" 
                      : "bg-[#0F0F0F]"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Glowing Border Effect only when active */}
                  {step.status === 'active' && (
                     <div className="absolute inset-0 rounded-2xl border border-[#6E532A] shadow-[0_0_30px_-10px_#6E532A]" />
                  )}
                  
                  {/* Content */}
                  <div className="flex items-center gap-4 relative z-20">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                      step.status === 'active' ? "bg-[#6E532A] text-white shadow-lg shadow-[#6E532A]/20" : 
                      step.status === 'success' ? "bg-[#1F1F1F] text-green-500 border border-green-500/20" : 
                      "bg-[#1A1A1A] text-gray-600 border border-white/5"
                    )}>
                      {step.status === 'active' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={cn(
                          "font-semibold truncate",
                          step.status === 'active' ? "text-[#6E532A]" : "text-white"
                        )}>
                          {step.title}
                        </h3>
                        {step.status === 'success' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{step.description}</p>
                    </div>
                  </div>
                </motion.div>

              </React.Fragment>
            ))}

            {/* End Node Indicator */}
             <div className="relative h-16 w-[2px] bg-white/5 my-0">
                 <motion.div 
                    className="absolute inset-0 w-full bg-[#6E532A] origin-top"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: !isRunning && logs.length > 5 ? 1 : 0 }} 
                    transition={{ duration: 0.5 }}
                 />
            </div>
            <div className={cn(
              "w-3 h-3 rounded-full border-2 transition-colors duration-500",
              !isRunning && logs.length > 5 ? "bg-[#6E532A] border-[#6E532A]" : "bg-[#1A1A1A] border-white/10"
            )} />

          </div>
        </div>

        {/* Right Panel: Logs (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="h-[38px] flex items-end pb-1">
            <h2 className="text-lg font-semibold text-gray-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Live Execution
            </h2>
          </div>

          {/* Logs Container */}
          <div className="flex-1 rounded-3xl bg-[#0A0A0A] border border-white/5 flex flex-col overflow-hidden shadow-2xl min-h-[400px] max-h-[600px]">
            {/* Mac-style Window Header */}
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              <div className="ml-auto text-xs text-gray-600 font-mono">bash</div>
            </div>

            {/* Scrollable Logs Area */}
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
               <AnimatePresence mode="popLayout">
                {logs.length === 0 && (
                   <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }}
                     className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2"
                   >
                      <Activity className="w-8 h-8 opacity-20" />
                      <p>Waiting for trigger...</p>
                   </motion.div>
                )}
                {logs.map((log, i) => (
                  <motion.div
                    key={`${log}-${i}`}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 text-gray-400 group hover:bg-white/5 p-1 rounded transition-colors"
                  >
                    <span className="text-[#6E532A] mt-1">
                      <ChevronRight className="w-3 h-3" />
                    </span>
                    <span className="break-all">{log.split("]")[1] || log}</span>
                  </motion.div>
                ))}
                <div ref={logsEndRef} />
              </AnimatePresence>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Total Executions</div>
                <div className="text-3xl font-bold text-white tracking-tight">12,402</div>
             </div>
             <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Success Rate</div>
                <div className="text-3xl font-bold text-[#6E532A] tracking-tight">99.9%</div>
             </div>
          </div>
        </div>

      </main>

      {/* Footer placed at the bottom */}
      <Footer />
    </div>
  );
}