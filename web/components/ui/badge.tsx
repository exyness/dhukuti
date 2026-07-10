import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone =
  | "accent"
  | "filter"
  | "filterActive"
  | "fixed"
  | "info"
  | "muted"
  | "rep"
  | "success"
  | "warning";
type BadgeShape = "default" | "pill" | "square";
type BadgeSize = "sm" | "xs";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  shape?: BadgeShape;
  size?: BadgeSize;
  tone?: BadgeTone;
};

type BadgeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  shape?: BadgeShape;
  size?: BadgeSize;
  tone?: BadgeTone;
};

const toneClass: Record<BadgeTone, string> = {
  accent: "border-accent/30 bg-accent/15 text-accent",
  filter: "border-white/[0.08] bg-white/[0.035] text-muted",
  filterActive: "border-accent/30 bg-accent/8 text-accent",
  fixed: "border-transparent bg-white/10 text-foreground",
  info: "border-info/30 bg-info/12 text-info",
  muted: "border-border bg-foreground/6 text-muted",
  rep: "border-accent/30 bg-transparent text-accent",
  success: "border-success/30 bg-success/12 text-success",
  warning: "border-warning/30 bg-warning/12 text-warning",
};

const shapeClass: Record<BadgeShape, string> = {
  default: "rounded-md",
  pill: "rounded-full",
  square: "rounded-[2px]",
};

const sizeClass: Record<BadgeSize, string> = {
  sm: "min-h-6 px-2 py-1 text-[0.62rem] tracking-[0.08em]",
  xs: "min-h-[1.45rem] px-2 py-[0.2rem] text-[0.6rem] tracking-[0.05em]",
};

export function Badge({
  children,
  className,
  shape = "default",
  size = "sm",
  tone = "muted",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border font-mono font-medium uppercase leading-none",
        toneClass[tone],
        shapeClass[shape],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function BadgeButton({
  children,
  className,
  shape = "pill",
  size = "xs",
  tone = "filter",
  type = "button",
  ...props
}: BadgeButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center border font-mono font-medium uppercase leading-none transition-colors hover:border-accent/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneClass[tone],
        shapeClass[shape],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
