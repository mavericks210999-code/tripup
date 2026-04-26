"use client";

import { FC } from "react";
import SiriOrb from "@/components/ui/smoothui/siri-orb";
import { cn } from "@/lib/utils";

interface AuroraOrbProps {
  className?: string;
  isThinking?: boolean;
}

const AURORA_COLORS = {
  bg:  "oklch(8% 0.025 165)",   // near-black with teal tint
  c1:  "oklch(78% 0.27 148)",   // vivid aurora green
  c2:  "oklch(72% 0.19 200)",   // teal / cyan
  c3:  "oklch(60% 0.23 295)",   // deep violet
};

export const AuroraOrb: FC<AuroraOrbProps> = ({
  className,
  isThinking = false,
}) => {
  return (
    <div className={cn("w-full h-full", className)}>
      <SiriOrb
        size="100%"
        colors={AURORA_COLORS}
        animationDuration={isThinking ? 7 : 20}
      />
    </div>
  );
};
