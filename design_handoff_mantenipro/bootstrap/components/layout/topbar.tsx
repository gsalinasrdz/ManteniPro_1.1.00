"use client";

import { Search, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  empresaNombre: string;
  title: string;
  onNuevaOrden?: () => void;
}

export function Topbar({ empresaNombre, title, onNuevaOrden }: TopbarProps) {
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
        <button
          className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary"
          aria-label="Notificaciones"
        >
          <Bell size={16} strokeWidth={1.5} />
          <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full border-2 border-bg-primary bg-status-danger-mid" />
        </button>
        <Button size="sm" onClick={onNuevaOrden}>
          <Plus size={13} className="mr-1" />
          Nueva OT
        </Button>
      </div>
    </header>
  );
}
