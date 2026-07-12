"use client";

import { Info } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function InfoPopover({
  children,
  className,
  label,
  triggerLabel,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  triggerLabel?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    placement: "bottom" | "top";
    top: number;
  }>({ left: 0, placement: "bottom", top: 0 });

  const hide = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const popoverWidth = 352;
    const halfWidth = popoverWidth / 2;
    const gap = 10;
    const estimatedHeight = 320;
    const hasRoomAbove = rect.top >= estimatedHeight + gap + 12;
    const placement = hasRoomAbove ? "top" : "bottom";

    setPosition({
      left: clamp(rect.left + rect.width / 2, halfWidth + 12, window.innerWidth - halfWidth - 12),
      placement,
      top: placement === "top" ? rect.top - gap : rect.bottom + gap,
    });
  }, []);

  const show = useCallback(() => {
    place();
    setOpen(true);
  }, [place]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      hide();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [hide, open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={label}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white/[0.02] px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => (open ? hide() : show())}
        onFocus={show}
        onPointerEnter={show}
        onPointerLeave={(event) => {
          if (!popoverRef.current?.contains(event.relatedTarget as Node | null)) hide();
        }}
      >
        <Info className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {triggerLabel ? <span>{triggerLabel}</span> : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              id={id}
              ref={popoverRef}
              role="dialog"
              aria-label={label}
              className={cn(
                "fixed z-[100] max-h-[80vh] w-[22rem] max-w-[92vw] -translate-x-1/2 overflow-y-auto rounded-lg border border-white/10 bg-[#151719] p-4 text-left opacity-100 shadow-[0_18px_44px_rgba(0,0,0,0.45)]",
                position.placement === "bottom" ? "translate-y-0" : "-translate-y-full",
                className,
              )}
              style={{ left: position.left, top: position.top }}
              onPointerEnter={() => setOpen(true)}
              onPointerLeave={hide}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
