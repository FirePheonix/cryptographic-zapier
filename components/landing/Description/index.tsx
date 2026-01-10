"use client";
import { useInView, motion } from "framer-motion";
import { useRef } from "react";

const slideUp = {
  initial: { y: "100%" },
  open: (i: number) => ({
    y: "0%",
    transition: { duration: 0.5, delay: 0.01 * i },
  }),
  closed: { y: "100%", transition: { duration: 0.5 } },
};

const opacity = {
  initial: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0.5, delay: 0.5 } },
  closed: { opacity: 0, transition: { duration: 0.5 } },
};

export default function Description() {
  const phrase =
    "Connect blockchain payments and on-chain events to real-world business workflows. Build entire business automations—no code required.";
  const description = useRef(null);
  const isInView = useInView(description);
  return (
    <div 
      ref={description} 
      className="flex justify-center items-center bg-black py-[200px] md:py-[100px]"
    >
      <div className="w-[80%] max-w-[1200px] md:w-[90%]">
        <p className="text-[4.5rem] md:text-[2.5rem] text-white leading-[5rem] md:leading-[3rem] font-light mb-10">
          {phrase.split(" ").map((word, index) => {
            return (
              <span 
                key={index} 
                className="overflow-hidden inline-flex leading-[1.2] mr-2.5"
              >
                <motion.span
                  variants={slideUp}
                  custom={index}
                  animate={isInView ? "open" : "closed"}
                  className="inline-block bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent"
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}


