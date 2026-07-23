"use client";

import { UserMinus, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export type CircleMemberAvatarData = {
  collateral?: string;
  handle: string;
  nextPayout?: string;
  reputation: number;
  role: string;
  state: string;
  summary?: string;
  vouch?: string;
};

export function CircleMemberAvatar({
  fallbackCollateral,
  member,
  minReputation,
}: {
  fallbackCollateral: string;
  member: CircleMemberAvatarData;
  minReputation: number;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    placement: "bottom" | "top";
    top: number;
  }>({
    left: 0,
    placement: "top",
    top: 0,
  });
  const [, setHideTimeout] = useState<number | null>(null);
  const isYou = member.role.startsWith("You");
  const isDefault = member.state === "Default risk";
  const isOpen = member.role === "Open";
  const isPaid = member.state === "Paid";

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

  const hide = useCallback(() => {
    cancelScheduledHide();
    setOpen(false);
  }, [cancelScheduledHide]);

  const show = useCallback(() => {
    cancelScheduledHide();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cardHalfWidth = 128;
    const cardHeight = 190;
    const gap = 12;
    const hasRoomAbove = rect.top >= cardHeight + gap + 12;
    const placement = hasRoomAbove ? "top" : "bottom";

    setPosition({
      left: clamp(
        rect.left + rect.width / 2,
        cardHalfWidth + 12,
        window.innerWidth - cardHalfWidth - 12,
      ),
      placement,
      top: placement === "top" ? rect.top - gap : rect.bottom + gap,
    });
    setOpen(true);
  }, [cancelScheduledHide]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);

    return () => {
      cancelScheduledHide();
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [cancelScheduledHide, hide, open]);

  return (
    <div className="relative isolate">
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label={`${member.handle} member summary`}
        className="group flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md transition-[background,border-color] duration-150 ease-out hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={hide}
        onClick={show}
        onFocus={show}
        onPointerCancel={hide}
        onPointerEnter={show}
        onPointerLeave={scheduleHide}
      >
        <div className={avatarRingClassName({ isDefault, isOpen, isYou })}>
          {isDefault ? (
            <UserMinus className="h-5 w-5 text-accent" aria-hidden="true" />
          ) : (
            <UserRound
              className={cn(
                "h-5 w-5",
                isYou ? "text-accent" : "text-white/40",
                isOpen && "text-white/20",
              )}
              aria-hidden="true"
            />
          )}
          <span className={statusDotClassName({ isDefault, isOpen, isPaid })} aria-hidden="true" />
        </div>
        <span
          className={cn(
            "font-mono text-[0.6rem] transition-colors",
            isYou || isDefault ? "text-accent" : "text-muted group-hover:text-foreground",
            isOpen && "text-white/30 group-hover:text-white/50",
          )}
        >
          {member.handle}
        </span>
        <span className="font-mono text-[0.52rem] text-white/25">
          {member.reputation > 0 ? `Rep ${member.reputation}` : "Available"}
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <MemberSummaryCard
              fallbackCollateral={fallbackCollateral}
              id={id}
              member={member}
              minReputation={minReputation}
              onPointerEnter={cancelScheduledHide}
              onPointerLeave={scheduleHide}
              position={position}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function MemberSummaryCard({
  fallbackCollateral,
  id,
  member,
  minReputation,
  onPointerEnter,
  onPointerLeave,
  position,
}: {
  fallbackCollateral: string;
  id: string;
  member: CircleMemberAvatarData;
  minReputation: number;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  position: { left: number; placement: "bottom" | "top"; top: number };
}) {
  const isOpen = member.role === "Open";
  const isBelow = position.placement === "bottom";

  return (
    <div
      id={id}
      role="tooltip"
      className={cn(
        "pointer-events-auto fixed z-[100] w-64 -translate-x-1/2 select-text rounded-lg border border-white/10 bg-[#151719] p-4 text-left opacity-100 shadow-[0_18px_44px_rgba(0,0,0,0.45)]",
        isBelow ? "translate-y-0" : "-translate-y-full",
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ left: position.left, top: position.top }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.72rem] font-medium text-foreground">{member.handle}</p>
          <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-muted">
            {member.role}
          </p>
        </div>
        <Badge tone={memberStatusTone(member.state)} shape="square" size="xs">
          {member.state}
        </Badge>
      </div>

      <p className="text-[0.72rem] leading-5 text-muted">
        {member.summary ?? "Member metadata is not indexed yet."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <MemberSummaryMetric
          label="Reputation"
          value={isOpen ? `${minReputation}+` : String(member.reputation)}
        />
        <MemberSummaryMetric label="Collateral" value={member.collateral ?? fallbackCollateral} />
        <MemberSummaryMetric label="Payout" value={member.nextPayout ?? "Unassigned"} />
        <MemberSummaryMetric label="Vouch" value={member.vouch ?? "None"} />
      </div>

      <span
        className={cn(
          "absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-white/10 bg-[#151719]",
          isBelow
            ? "top-0 -translate-y-1/2 border-t border-l"
            : "top-full -translate-y-1/2 border-r border-b",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

function MemberSummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-white/32">
        {label}
      </span>
      <span className="mt-1 block font-mono text-[0.66rem] leading-4 text-foreground">{value}</span>
    </div>
  );
}

function avatarRingClassName({
  isDefault,
  isOpen,
  isYou,
}: {
  isDefault: boolean;
  isOpen: boolean;
  isYou: boolean;
}) {
  if (isYou) {
    return "relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/8";
  }

  if (isDefault) {
    return "relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/25 bg-white/[0.02]";
  }

  if (isOpen) {
    return "relative flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-white/12 bg-white/[0.015]";
  }

  return "relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white/[0.03]";
}

function memberStatusTone(state: string): "accent" | "muted" | "success" | "warning" {
  if (state === "Paid") {
    return "success";
  }

  if (state === "Default risk") {
    return "accent";
  }

  if (state === "Open") {
    return "muted";
  }

  return "warning";
}

function statusDotClassName({
  isDefault,
  isOpen,
  isPaid,
}: {
  isDefault: boolean;
  isOpen: boolean;
  isPaid: boolean;
}) {
  if (isDefault) {
    return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-accent";
  }

  if (isPaid) {
    return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-success";
  }

  if (isOpen) {
    return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-white/20";
  }

  return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-warning";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
