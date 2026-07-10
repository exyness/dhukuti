import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "accent" | "muted" | "success" | "info" | "warning";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneClass: Record<BadgeTone, string> = {
  accent: "border-accent/30 bg-accent/15 text-accent",
  muted: "border-border bg-foreground/6 text-muted",
  success: "border-success/30 bg-success/12 text-success",
  info: "border-info/30 bg-info/12 text-info",
  warning: "border-warning/30 bg-warning/12 text-warning",
};

export function Badge({ children, className, tone = "muted", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-1 font-mono text-[0.62rem] font-medium uppercase leading-none tracking-[0.08em]",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
