"use client";

import { cn } from "@/lib/utils";

type Salud = "sano" | "atencion" | "critico";

const dotClasses: Record<Salud, string> = {
  sano:     "bg-status-ok",
  atencion: "bg-status-warn-mid",
  critico:  "bg-status-danger-mid",
};

interface SucChipProps {
  active?: boolean;
  onClick?: () => void;
  salud?: Salud;
  children: React.ReactNode;
}

/**
 * Chip de selección de sucursal usado en el Dashboard.
 * Muestra un dot de color según el estado de salud de esa sucursal.
 */
export function SucChip({ active, onClick, salud, children }: SucChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-brand-blue bg-brand-blue text-white"
          : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
      )}
    >
      {salud && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-white/90" : dotClasses[salud]
          )}
        />
      )}
      {children}
    </button>
  );
}
