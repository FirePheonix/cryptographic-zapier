"use client";
import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { motion, type Variants } from "motion/react";

const slideUp: Variants = {
  initial: { y: 300 },
  enter: {
    y: 0,
    transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] as const, delay: 0.3 },
  },
};

const fadeIn: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" as const, delay: 0.8 },
  },
};

export default function Landing() {
  const firstText = useRef<HTMLParagraphElement | null>(null);
  const secondText = useRef<HTMLParagraphElement | null>(null);
  const slider = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  let xPercent = 0;
  let direction = -1;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    // Only run on client and when mounted
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    // Check if refs are available before running GSAP animations
    if (!slider.current || !firstText.current || !secondText.current) {
      return;
    }

    // Dynamically import GSAP to avoid SSR issues
    const initGsap = async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      
      gsap.registerPlugin(ScrollTrigger);

      if (!slider.current) return;

      gsap.to(slider.current, {
        scrollTrigger: {
          trigger: document.documentElement,
          scrub: 0.25,
          start: 0,
          end: window.innerHeight,
          onUpdate: (e) => (direction = e.direction * -1),
        },
        x: "-500px",
      });

      const animate = () => {
        if (xPercent < -100) {
          xPercent = 0;
        } else if (xPercent > 0) {
          xPercent = -100;
        }

        // Check refs before setting
        if (firstText.current) {
          gsap.set(firstText.current, { xPercent });
        }
        if (secondText.current) {
          gsap.set(secondText.current, { xPercent });
        }

        xPercent += 0.1 * direction;
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    };

    initGsap();
  }, [isMounted]);

  return (
    <motion.main
      variants={slideUp}
      initial="initial"
      animate="enter"
      className="relative flex h-screen overflow-hidden"
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/hero-bg-video.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-[1]" />

      {/* Left Content – Zynthex Description */}
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="enter"
        className="absolute z-[2] left-[8%] top-[30%] max-w-xl text-white"
      >
        <h1 className="text-5xl font-medium mb-6 leading-tight">
          Zynthex
        </h1>

        <p className="text-lg text-white/80 mb-4">
          Zynthex is an <span className="text-white">AI Agents Automation platform</span>
          build native to the Crytp-Payments chain that reacts instantly when money moves.
        </p>

        <p className="text-lg text-white/70 mb-6">
          Connect wallets, payment gateways, and APIs — then automate everything
          after a transaction: notifications, databases, analytics, and workflows.
        </p>

        <div className="flex gap-6 text-sm text-white/60">
          <span>• Build AI Agents</span>
          <span>• On-chain payments</span>
          <span>• No-code workflows</span>
        </div>
      </motion.div>

      {/* Moving Text */}
      <div className="absolute top-[calc(100vh-350px)] z-[2]">
        <div ref={slider} className="relative whitespace-nowrap">
          <p
            ref={firstText}
            className="relative m-0 text-white text-[230px] font-medium pr-[50px]"
          >
            AI-Powered Automation -
          </p>
          <p
            ref={secondText}
            className="absolute left-full top-0 m-0 text-white text-[230px] font-medium pr-[50px]"
          >
            AI-Powered Automation -
          </p>
        </div>
      </div>

    </motion.main>
  );
}
