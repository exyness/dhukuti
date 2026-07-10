"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type StaggerConfig = {
  stagger: number;
  offsetY: number;
  spring: {
    type: "spring";
    stiffness: number;
    damping: number;
  };
};

type StaggerItemProps = {
  children: ReactNode;
  config: StaggerConfig;
  index: number;
  reducedMotion?: boolean;
  visible: boolean;
  className?: string;
};

export function StaggerItem({
  children,
  className,
  config,
  index,
  reducedMotion = false,
  visible,
}: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: config.offsetY }}
      animate={{
        opacity: visible || reducedMotion ? 1 : 0,
        y: visible || reducedMotion ? 0 : config.offsetY,
      }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              ...config.spring,
              delay: visible ? index * config.stagger : 0,
            }
      }
    >
      {children}
    </motion.div>
  );
}
