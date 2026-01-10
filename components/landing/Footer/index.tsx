"use client";
import { motion } from "framer-motion";
import { Wallet, Zap, Shield } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-[#222] pt-[60px] pb-[40px] md:pt-[40px] md:pb-[30px]">
      <div className="max-w-[1400px] mx-auto px-10 md:px-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:grid-cols-2 gap-[40px] md:gap-8 mb-12 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white text-lg font-semibold">Product</h3>
            <ul className="list-none p-0">
              <li><a href="#features" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Features</a></li>
              <li><a href="#integrations" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Integrations</a></li>
              <li><a href="#pricing" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Pricing</a></li>
              <li><a href="#changelog" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Changelog</a></li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white text-lg font-semibold">Resources</h3>
            <ul className="list-none p-0">
              <li><a href="#docs" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Documentation</a></li>
              <li><a href="#api" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">API Reference</a></li>
              <li><a href="#templates" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Templates</a></li>
              <li><a href="#guides" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Guides</a></li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white text-lg font-semibold">Legal</h3>
            <ul className="list-none p-0">
              <li><a href="/privacy" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Privacy Policy</a></li>
              <li><a href="/terms" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Terms of Service</a></li>
              <li><a href="/acceptable-use" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Acceptable Use</a></li>
              <li><a href="#security" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Security</a></li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white text-lg font-semibold">Community</h3>
            <ul className="list-none p-0">
              <li><a href="#twitter" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Twitter / X</a></li>
              <li><a href="#discord" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Discord</a></li>
              <li><a href="#github" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">GitHub</a></li>
              <li><a href="#telegram" className="text-[#666] no-underline transition-colors duration-300 text-sm hover:text-white">Telegram</a></li>
            </ul>
          </motion.div>
        </div>

        {/* Large Zynthex Banner */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Image
            src="/zynthex-banner-svg.svg"
            alt="Zynthex"
            width={1400}
            height={200}
            className="w-full max-w-[1400px] h-auto"
            priority={false}
          />
        </motion.div>
      </div>
    </footer>
  );
}


