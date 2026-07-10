"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type DropdownOption<T extends string> = {
  label: string;
  value: T;
};

type DropdownSelectProps<T extends string> = {
  label: string;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  value: T;
};

export function DropdownSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="filter-control inline-flex items-center gap-2"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="sr-only">{label}</span>
        {selected.label}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-md border border-border bg-[#151719] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.42)]"
        >
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex min-h-9 w-full items-center justify-between gap-4 rounded px-3 text-left font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "text-accent",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
