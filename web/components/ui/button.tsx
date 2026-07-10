import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-[0.72rem] text-[0.6rem]",
  md: "min-h-11 px-5 text-[0.7rem]",
  lg: "min-h-12 px-6 text-[0.74rem]",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  const isPrimary = variant === "primary";

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group relative isolate inline-flex items-center justify-center gap-2 rounded-md border font-mono font-medium uppercase tracking-[0.08em]",
        "transition-[box-shadow,border-color,filter] duration-150 ease-out cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-55",
        isPrimary
          ? "border-[rgba(255,196,178,0.42)] bg-[#bf4934] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(92,20,8,0.3),0_1px_1px_rgba(0,0,0,0.34),0_5px_10px_rgba(0,0,0,0.2)] hover:border-[rgba(255,225,216,0.5)] hover:brightness-[1.01] active:brightness-[0.97]"
          : "",
        variant === "secondary"
          ? "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-[var(--ink)]"
          : "",
        variant === "ghost"
          ? "border-transparent bg-transparent text-muted hover:bg-foreground/8 hover:text-foreground"
          : "",
        variant === "link"
          ? "border-transparent bg-transparent text-foreground hover:text-accent"
          : "",
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {isPrimary ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 z-0 translate-y-px rounded-[inherit] bg-[linear-gradient(to_bottom,#ff8264,#e3573d)] transition-[background,filter] duration-150 ease-out group-hover:bg-[linear-gradient(to_bottom,#f06446,#e3573d)]"
          />
          <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
