"use client";

import Link from "next/link";
import { Search, Bell } from "lucide-react";

interface TopbarProps {
  empresaNombre: string;
  title: string;
  alertCount?: number;
}

export function Topbar({ empresaNombre, title, alertCount = 0 }: TopbarProps) {
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-bg-primary px-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {empresaNombre}
        </div>
        <div className="mt-px text-lg font-medium">{title}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary"
          aria-label="Buscar"
        >
          <Search size={16} strokeWidth={1.5} />
        </button>
        <Link
          href="/alertas"
          className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary"
          aria-label={`Alertas${alertCount > 0 ? ` — ${alertCount} activas` : ""}`}
        >
          <Bell size={16} strokeWidth={1.5} />
          {alertCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-bg-primary bg-status-danger px-0.5 text-[9px] font-bold leading-none text-white">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
