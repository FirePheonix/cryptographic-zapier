"use client";
import Landing from "@/components/landing/Landing";
import Header from "@/components/landing/Header";
import Description from "@/components/landing/Description";
import Features from "@/components/landing/Features";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import Image from "next/image";

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-black overflow-x-hidden">
      <Header />
      <Landing />
      
      {/* Banner Images */}
      <section className="w-full bg-black px-4 py-8 md:px-8">
        <div className="w-full max-w-[1400px] mx-auto space-y-6">
          <Image
            src="/banner-1-updated.png"
            alt="Banner 1"
            width={1400}
            height={400}
            className="w-full h-auto rounded-2xl"
          />
          <Image
            src="/banner-2-updated.png"
            alt="Banner 2"
            width={1400}
            height={400}
            className="w-full h-auto rounded-2xl"
          />
        </div>
      </section>

      <Description />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
}


