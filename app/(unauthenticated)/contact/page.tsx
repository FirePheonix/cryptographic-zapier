"use client";

import React from "react";
import { Mail, Globe, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";

export default function ContactPage() {
  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 flex flex-col pt-20">
      <Header />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <h1 className="text-5xl font-bold tracking-tight">Connect with us</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Need custom automation solutions or enterprise support? Our team is ready to help you scale your blockchain operations.
          </p>
          
          <div className="space-y-6 pt-10">
            {[
              { icon: Mail, label: "Email", value: "dev@zynthex.xyz" },
              { icon: MessageSquare, label: "Discord", value: "Join our community" },
              { icon: Globe, label: "Network", value: "Solana Mainnet" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-6 p-6 rounded-3xl bg-[#0a0a0a] border border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-[#6E532A]/10 flex items-center justify-center border border-[#6E532A]/20">
                  <item.icon className="w-6 h-6 text-[#6E532A]" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">{item.label}</div>
                  <div className="text-white font-semibold">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
              <Input placeholder="Satoshi Nakamoto" className="bg-black border-white/10 focus:border-[#6E532A] h-14 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
              <Input type="email" placeholder="satoshi@p2p.org" className="bg-black border-white/10 focus:border-[#6E532A] h-14 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Message</label>
              <Textarea placeholder="How can we help?" className="bg-black border-white/10 focus:border-[#6E532A] min-h-[160px] rounded-2xl py-4" />
            </div>
            <Button className="w-full bg-[#6E532A] hover:bg-[#5a4321] text-white font-bold h-14 rounded-2xl text-lg transition-all active:scale-95">
              Initialize Contact
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}