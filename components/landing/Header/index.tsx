"use client";
import React, { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Image from "next/image";
import { Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GetStartedButton } from "@/components/landing/get-started-button";

const PrimaryButton = ({ 
  children, 
  classname, 
  onClick 
}: { 
  children: React.ReactNode;
  classname?: string;
  onClick?: () => void;
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex gap-2 items-center justify-center px-5 py-3 rounded-[16px] relative",
        "border-x border-t-2 border-[#5728f4]",
        "bg-gradient-to-b from-[#5728f4] to-[#5100FF]",
        "[box-shadow:0px_-2px_0px_0px_#2c04b1_inset]",
        "hover:opacity-90 transition-opacity duration-100",
        "text-white font-medium",
        classname
      )}
    >
      {children}
    </motion.button>
  );
};

export default function Header() {
  const { scrollYProgress } = useScroll();
  const pathname = usePathname();
  const isPricingPage = pathname === "/pricing";
  const [showNavbar, setShowNavbar] = useState(isPricingPage ? true : false);
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        (document.activeElement as HTMLElement)?.blur();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!isPricingPage) {
      setShowNavbar(latest > 0);
    }
  });

  const links = [
    { name: "Features", href: "/#features" },
    { name: "Demo", href: "/#demo" },
    { name: "How it works", href: "/#how-it-works" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Contact", href: "/#contact" },
    { name: "FAQ", href: "/#faq" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={showNavbar ? { opacity: 1 } : { opacity: 0, display: "none" }}
      transition={{ duration: 0.3 }}
      className={cn(
        " z-40  flex items-center justify-between px-4 py-3  bg-neutral-900/5 backdrop-blur-xl  border-white/10",
        isPricingPage
          ? "relative h-max md:w-full top-0 border-b"
          : "fixed rounded-3xl top-4 border w-[94%] md:w-[80%] mx-auto left-1/2 -translate-x-1/2"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          className="min-[1115px]:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        <Link href="/" className="text-xl md:text-2xl font-medium tracking-tighter flex items-center gap-2">
          <Image
            src="/zynthex200x200-svg.svg"
            alt="Zynthex Logo"
            width={40}
            height={40}
            className="w-8 md:w-10 h-8 md:h-10"
          />
          <Image
            src="/zynthex-banner-no-bg-svg.svg"
            alt="Zynthex"
            width={120}
            height={30}
            className="h-6 md:h-7 w-auto hidden sm:block"
          />
        </Link>
      </div>
      <div className="hidden min-[1115px]:flex items-center gap-5 max-[1270px]:gap-4 max-[1173px]:gap-3 tracking-tight text-lg max-[1270px]:text-base max-[1173px]:text-sm font-light max-[1173px]:font-normal text-[#d1d1d1]">
        {links.map((link, index) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={index}
              href={link.href}
              className={cn(
                "cursor-pointer hover:text-white",
                isActive && "text-white"
              )}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden min-[1115px]:flex items-center gap-2 px-4 py-2.5 bg-[#24292e] hover:bg-[#2c3237] transition-colors rounded-lg border border-[#444c56] text-white"
        >
          <Github className="w-5 h-5" />
          <span className="text-sm font-medium">Star on GitHub</span>
        </Link>
        <GetStartedButton className="px-3 py-2 text-sm whitespace-nowrap md:px-5 md:py-3 md:text-base cursor-pointer z-30">
          Get Started
        </GetStartedButton>
      </div>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute top-full mt-2 left-0 w-full bg-neutral-900/90 backdrop-blur-xl border border-white/10 min-[1115px]:hidden flex flex-col items-center py-5 space-y-4 z-50 rounded-3xl"
        >
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 text-lg"
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 bg-[#24292e] hover:bg-[#2c3237] rounded-lg border border-[#444c56] text-white transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="text-sm font-medium">Star on GitHub</span>
          </Link>
        </motion.div>
      )}
    </motion.nav>
  );
}


