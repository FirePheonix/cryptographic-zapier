"use client";

import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface GetStartedButtonProps {
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function GetStartedButton({ 
  className, 
  children,
  showIcon = true 
}: GetStartedButtonProps) {
  const user = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (user) {
      // User is logged in - go to the app
      router.push("/workflows");
    } else {
      // User is not logged in - go to sign up page
      router.push("/auth/sign-up");
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        "flex gap-2 items-center justify-center px-5 py-3 rounded-[16px] relative",
        "border-x border-t-2 border-[#5728f4]",
        "bg-gradient-to-b from-[#5728f4] to-[#5100FF]",
        "[box-shadow:0px_-2px_0px_0px_#2c04b1_inset]",
        "hover:opacity-90 transition-opacity duration-100",
        "text-white font-medium",
        className
      )}
    >
      {showIcon && <Terminal className="w-4 h-4 md:w-5 md:h-5" />}
      <span>{children || "Get Started"}</span>
    </motion.button>
  );
}
