"use client";

import {
  cloneElement,
  type FocusEventHandler,
  isValidElement,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type TooltipSide = "right" | "top";

type TooltipTriggerProps = {
  "aria-describedby"?: string;
  onBlurCapture?: FocusEventHandler<HTMLElement>;
  onClickCapture?: MouseEventHandler<HTMLElement>;
  onFocusCapture?: FocusEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onPointerCancel?: PointerEventHandler<HTMLElement>;
  onPointerDownCapture?: PointerEventHandler<HTMLElement>;
  onPointerEnter?: PointerEventHandler<HTMLElement>;
  onPointerLeave?: PointerEventHandler<HTMLElement>;
};

export function Tooltip({
  children,
  className,
  enabled = true,
  label,
  side = "right",
}: {
  children: ReactElement<TooltipTriggerProps>;
  className?: string;
  enabled?: boolean;
  label: string;
  side?: TooltipSide;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPosition(
      side === "right"
        ? { left: rect.right + 12, top: rect.top + rect.height / 2 }
        : { left: rect.left + rect.width / 2, top: rect.top - 10 },
    );
  }, [side]);

  const hide = useCallback(() => setOpen(false), []);

  const show = useCallback(() => {
    if (!enabled) return;
    updatePosition();
    setOpen(true);
  }, [enabled, updatePosition]);

  useEffect(() => {
    if (!enabled) {
      hide();
    }
  }, [enabled, hide]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);

    return () => {
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [hide, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }

    const timeout = window.setTimeout(hide, 1800);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", hide);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", hide);
    };
  }, [hide, open]);

  const trigger = isValidElement<TooltipTriggerProps>(children)
    ? cloneElement(children, {
        "aria-describedby": open ? id : children.props["aria-describedby"],
        onBlurCapture: composeEventHandler(children.props.onBlurCapture, hide),
        onClickCapture: composeEventHandler(children.props.onClickCapture, hide),
        onFocusCapture: composeEventHandler(children.props.onFocusCapture, show),
        onMouseLeave: composeEventHandler(children.props.onMouseLeave, hide),
        onPointerCancel: composeEventHandler(children.props.onPointerCancel, hide),
        onPointerDownCapture: composeEventHandler(children.props.onPointerDownCapture, hide),
        onPointerEnter: composeEventHandler(children.props.onPointerEnter, show),
        onPointerLeave: composeEventHandler(children.props.onPointerLeave, hide),
      })
    : children;

  return (
    <span ref={triggerRef} className={cn("inline-flex", className)}>
      {trigger}
      {open && enabled && typeof document !== "undefined"
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="pointer-events-none fixed z-[100] whitespace-nowrap rounded border border-white/10 bg-[#151719] px-2.5 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-white/72 opacity-100 shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
              style={{
                left: position.left,
                top: position.top,
                transform: side === "right" ? "translateY(-50%)" : "translate(-50%, -100%)",
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function composeEventHandler<Event extends { defaultPrevented?: boolean }>(
  userHandler: ((event: Event) => void) | undefined,
  ownHandler: () => void,
) {
  return (event: Event) => {
    userHandler?.(event);

    if (!event.defaultPrevented) {
      ownHandler();
    }
  };
}
