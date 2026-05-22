import { MapPin } from "lucide-react";
import { cn, shortenSucursal } from "@/lib/utils";

interface LocationBadgeProps {
  sucursal: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Badge azul con icono de pin que identifica la sucursal de un equipo / OT / incidencia.
 * Usado en filas de listas y kanban cards para hacer evidente la ubicación.
 */
export function LocationBadge({
  sucursal,
  size = "sm",
  className,
}: LocationBadgeProps) {
  const iconSize = size === "sm" ? 9 : 11;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-blue-light px-2 py-0.5 font-medium text-brand-blue",
        size === "sm" ? "text-[10px]" : "text-[11px]",
        className
      )}
    >
      <MapPin size={iconSize} strokeWidth={1.5} />
      {shortenSucursal(sucursal)}
    </span>
  );
}
