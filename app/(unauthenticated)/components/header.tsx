"use client";

import React from "react";
// Import the floating header from your landing components
import Header from "@/components/landing/Header/index"; 
import Footer from "@/components/landing/Footer/index";

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#6E532A]/30 flex flex-col">
      {/* This renders the floating bar exactly as it appears on the home page */}
      <Header /> 

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-20 mt-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-center">
          Pricing
        </h1>
        {/* Your Page Content Here */}
      </main>
    </div>
  );
}