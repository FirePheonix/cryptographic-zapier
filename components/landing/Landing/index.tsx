"use client";
import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { motion } from "motion/react";

const slideUp = {
  initial: { y: 300 },
  enter: {
    y: 0,
    transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1], delay: 0.3 },
  },
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut", delay: 0.8 },
  },
};

export default function Landing() {
  const firstText = useRef<HTMLParagraphElement | null>(null);
  const secondText = useRef<HTMLParagraphElement | null>(null);
  const slider = useRef<HTMLDivElement | null>(null);

  let xPercent = 0;
  let direction = -1;

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

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

    requestAnimationFrame(animate);
  }, []);

  const animate = () => {
    if (xPercent < -100) {
      xPercent = 0;
    } else if (xPercent > 0) {
      xPercent = -100;
    }

    gsap.set(firstText.current, { xPercent });
    gsap.set(secondText.current, { xPercent });

    xPercent += 0.1 * direction;
    requestAnimationFrame(animate);
  };

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
          Zynthex is an <span className="text-white">x402 AI Agents Automation platform</span>
          build native to the Cronos chain that reacts instantly when money moves.
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
            x402 Cronos Automation -
          </p>
          <p
            ref={secondText}
            className="absolute left-full top-0 m-0 text-white text-[230px] font-medium pr-[50px]"
          >
            x402 Cronos Automation -
          </p>
        </div>
      </div>

    </motion.main>
  );
}
