import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocalTime } from "./local-time";

export const Footer = () => (
  <div className="relative grid w-full grid-cols-[0.2fr_3fr_0.2fr] md:grid-cols-[0.5fr_3fr_0.5fr]">
    {/* Gradient overlays */}
    <div className="pointer-events-none absolute inset-0">
      {/* <div className="absolute top-0 right-0 left-0 h-8 bg-gradient-to-b from-background to-transparent" /> */}
      <div className="absolute right-0 bottom-0 left-0 h-6 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>

    {/* Top row */}

    
    <div className="relative flex items-center justify-center border-x border-b border-dotted">
      {/* Corner decorations */}
      <div className="-left-[3px] -top-[3px] absolute">
        <div className="relative z-1 h-[5px] w-[5px] transform rounded-full bg-border ring-2 ring-background" />
      </div>
      <div className="-right-[3px] -top-[3px] absolute">
        <div className="relative z-1 h-[5px] w-[5px] transform rounded-full bg-border ring-2 ring-background" />
      </div>
      <div className="-bottom-[3px] -left-[3px] absolute">
        <div className="relative z-1 h-[5px] w-[5px] transform rounded-full bg-border ring-2 ring-background" />
      </div>
      <div className="-bottom-[3px] -right-[3px] absolute">
        <div className="relative z-1 h-[5px] w-[5px] transform rounded-full bg-border ring-2 ring-background" />
      </div>


    </div>
    
  </div>
);


