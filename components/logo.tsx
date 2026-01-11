import Image from "next/image";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Logo = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("relative h-auto w-full", className)} {...props}>
    <Image
      src="/logo.png"
      alt="Zynthex Logo"
      width={106}
      height={118}
      className="h-full w-full object-contain"
    />
  </div>
);


