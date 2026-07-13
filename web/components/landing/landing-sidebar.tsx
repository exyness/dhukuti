"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { NoiseCanvas } from "@/components/layout/noise-canvas";
import { cn } from "@/lib/cn";
import { SidebarWalletFlow } from "./sidebar-wallet-flow";

type LandingSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function LandingSidebar({ collapsed, onToggle }: LandingSidebarProps) {
  return (
    <>
      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[420px] shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.05] bg-[#151719] p-10 text-white transition-transform duration-[400ms] ease-in-out",
          collapsed && "-translate-x-full",
        )}
      >
        <NoiseCanvas />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(245,245,245,0.045),rgba(245,245,245,0)_34%),radial-gradient(120%_78%_at_50%_112%,rgba(255,107,74,0.18),rgba(255,107,74,0.055)_28%,rgba(255,107,74,0)_62%),linear-gradient(180deg,rgba(22,24,25,0),rgba(5,6,7,0.24))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#1A1C1E_0%,#2D3436_45%,#1E272E_50%,#121417_100%)]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" priority />
          <span className="font-geist text-[0.95rem] font-semibold tracking-tight">Dhukuti</span>
        </div>

        <SidebarWalletFlow />

        <div className="relative z-10">
          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-widest text-white/20">
            <span>dhukuti.io</span>
            <span className="text-white/10">—</span>
            <span>Established 2026</span>
          </div>
        </div>
      </aside>

      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title="Toggle Sidebar"
        className={cn(
          "fixed bottom-5 z-[60] flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.08] backdrop-blur-xl transition-[left,background] duration-[400ms] ease-in-out hover:bg-white/[0.12] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]",
          collapsed ? "left-5" : "left-[360px]",
        )}
        onClick={onToggle}
      >
        {collapsed ? (
          <PanelLeftOpen
            className="h-4 w-4 text-white/60 cursor-pointer transition-colors duration-200 group-hover:text-[var(--accent)]"
            aria-hidden="true"
          />
        ) : (
          <PanelLeftClose
            className="h-4 w-4 text-white/60 cursor-pointer transition-colors duration-200 group-hover:text-[var(--accent)]"
            aria-hidden="true"
          />
        )}
      </button>
    </>
  );
}
