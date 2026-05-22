"use client";

import { cn } from "@/lib/utils";
import { shortenSucursal } from "@/lib/utils";
import { SucChip } from "@/components/atoms/suc-chip";
import { useGlobalFilters } from "@/lib/stores/filters";

export type ZonaOpt = { id: string; nombre: string };
export type SucOpt  = { id: string; nombre: string; zonaId: string | null; equiposConFalla: number };

interface ZonaFilterProps {
  zonas:               ZonaOpt[];
  sucursales:          SucOpt[];
  puedeFiltraSucursal: boolean;
}

function saludSucursal(n: number): "sano" | "atencion" | "critico" {
  return n === 0 ? "sano" : n === 1 ? "atencion" : "critico";
}

export function ZonaFilter({ zonas, sucursales, puedeFiltraSucursal }: ZonaFilterProps) {
  const { zonaId, sucursalId, setZonaId, setSucursalId } = useGlobalFilters();

  if (!puedeFiltraSucursal) return null;

  const sucFiltradas = zonaId
    ? sucursales.filter((s) => s.zonaId === zonaId)
    : sucursales;

  const hayZonas = zonas.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Chips de zona */}
      {hayZonas && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setZonaId(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              zonaId === null
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
            )}
          >
            Todas las zonas
          </button>
          {zonas.map((z) => (
            <button
              key={z.id}
              onClick={() => setZonaId(z.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                zonaId === z.id
                  ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                  : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
              )}
            >
              {z.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Chips de sucursal */}
      <div className="flex flex-wrap gap-1.5">
        <SucChip
          active={sucursalId === null}
          onClick={() => setSucursalId(null)}
        >
          Todas
        </SucChip>
        {sucFiltradas.map((s) => (
          <SucChip
            key={s.id}
            salud={saludSucursal(s.equiposConFalla)}
            active={sucursalId === s.id}
            onClick={() => setSucursalId(sucursalId === s.id ? null : s.id)}
          >
            {shortenSucursal(s.nombre)}
          </SucChip>
        ))}
      </div>
    </div>
  );
}
