"use client";

import {
  cloneElement,
  type FocusEventHandler,
  isValidElement,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
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
  content,
  contentClassName,
  enabled = true,
  label,
  side = "right",
}: {
  children: ReactElement<TooltipTriggerProps>;
  className?: string;
  content?: ReactNode;
  contentClassName?: string;
  enabled?: boolean;
  label: string;
  side?: TooltipSide;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [, setHideTimeout] = useState<number | null>(null);

  const cancelScheduledHide = useCallback(() => {
    setHideTimeout((currentTimeout) => {
      if (currentTimeout === null) return null;
      window.clearTimeout(currentTimeout);
      return null;
    });
  }, []);

  const scheduleHide = useCallback(() => {
    cancelScheduledHide();
    const timeout = window.setTimeout(() => {
      setHideTimeout(null);
      setOpen(false);
    }, 220);
    setHideTimeout(timeout);
  }, [cancelScheduledHide]);

  const show = useCallback(
    (element: HTMLElement) => {
      if (!enabled) return;
      cancelScheduledHide();
      const rect = element.getBoundingClientRect();
      setPosition(
        side === "right"
          ? { left: rect.right + 12, top: rect.top + rect.height / 2 }
          : { left: rect.left + rect.width / 2, top: rect.top - 10 },
      );
      setOpen(true);
    },
    [cancelScheduledHide, enabled, side],
  );

  const hide = useCallback(() => {
    cancelScheduledHide();
    setOpen(false);
  }, [cancelScheduledHide]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);

    return () => {
      cancelScheduledHide();
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [cancelScheduledHide, hide, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }

    const timeout = content ? undefined : window.setTimeout(hide, 1800);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", hide);

    return () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      cancelScheduledHide();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", hide);
    };
  }, [cancelScheduledHide, content, hide, open]);

  const trigger = isValidElement<TooltipTriggerProps>(children)
    ? cloneElement(children, {
        "aria-describedby": open && enabled ? id : children.props["aria-describedby"],
        onBlurCapture: composeEventHandler(children.props.onBlurCapture, hide),
        onClickCapture: composeEventHandler(children.props.onClickCapture, hide),
        onFocusCapture: composeEventHandler(children.props.onFocusCapture, (event) =>
          show(event.currentTarget),
        ),
        onMouseLeave: composeEventHandler(children.props.onMouseLeave, scheduleHide),
        onPointerCancel: composeEventHandler(children.props.onPointerCancel, hide),
        onPointerDownCapture: composeEventHandler(children.props.onPointerDownCapture, hide),
        onPointerEnter: composeEventHandler(children.props.onPointerEnter, (event) =>
          show(event.currentTarget),
        ),
        onPointerLeave: composeEventHandler(children.props.onPointerLeave, scheduleHide),
      })
    : children;

  const TooltipContent = content ? "div" : "span";

  return (
    <span className={cn("inline-flex", className)}>
      {trigger}
      {open && enabled && typeof document !== "undefined"
        ? createPortal(
            <TooltipContent
              id={id}
              role="tooltip"
              onPointerEnter={content ? cancelScheduledHide : undefined}
              onPointerLeave={content ? scheduleHide : undefined}
              className={cn(
                "fixed z-[100] rounded-xl border border-white/[0.12] bg-[#171a1b] text-white/72 opacity-100 shadow-[0_16px_40px_rgba(0,0,0,0.42)]",
                content
                  ? "pointer-events-auto select-text whitespace-normal"
                  : "pointer-events-none whitespace-nowrap font-mono px-2.5 py-1.5 text-[0.58rem] uppercase tracking-[0.08em]",
                contentClassName,
              )}
              style={{
                left: position.left,
                top: position.top,
                transform: side === "right" ? "translateY(-50%)" : "translate(-50%, -100%)",
              }}
            >
              {content ?? label}
            </TooltipContent>,
            document.body,
          )
        : null}
    </span>
  );
}

function composeEventHandler<Event extends { defaultPrevented?: boolean }>(
  userHandler: ((event: Event) => void) | undefined,
  ownHandler: (event: Event) => void,
) {
  return (event: Event) => {
    userHandler?.(event);

    if (!event.defaultPrevented) {
      ownHandler(event);
    }
  };
}
