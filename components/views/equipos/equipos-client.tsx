"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalFilters } from "@/lib/stores/filters";
import { SucChip } from "@/components/atoms/suc-chip";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";
import { shortenSucursal } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { EquipoDrawer } from "@/components/views/equipos/equipo-drawer";
import type { EquipoConRelaciones } from "@/components/views/equipos/equipo-drawer";
import { NuevoEquipoModal } from "@/components/views/equipos/nuevo-equipo-modal";
import { transitionEquipo } from "@/lib/actions/equipo";

export type { EquipoConRelaciones };

type SucursalResumen = {
  id: string;
  nombre: string;
  equiposConFalla: number;
};

interface EquiposClientProps {
  equipos: EquipoConRelaciones[];
  sucursales: SucursalResumen[];
  puedeFiltraSucursal: boolean;
}

const CRITICIDAD_TONE: Record<string, "danger" | "warn" | "ok"> = {
  ALTA:  "danger",
  MEDIA: "warn",
  BAJA:  "ok",
};

const ESTADO_LABEL: Record<string, string> = {
  OPERATIVO:     "Operativo",
  MANTENIMIENTO: "Mantenimiento",
  FALLA:         "Falla",
  BAJA:          "Baja",
};

const ESTADO_TONE: Record<string, "ok" | "warn" | "danger" | "gray"> = {
  OPERATIVO:     "ok",
  MANTENIMIENTO: "warn",
  FALLA:         "danger",
  BAJA:          "gray",
};

const TRANSITION_TOAST: Record<string, { title: string; desc: (cu: string) => string }> = {
  OPERATIVO: {
    title: "Equipo operativo",
    desc:  (cu) => `${cu} marcado como operativo.`,
  },
  FALLA: {
    title: "Falla registrada",
    desc:  (cu) => `${cu} marcado con falla activa. Considera abrir una incidencia.`,
  },
  MANTENIMIENTO: {
    title: "Equipo en mantenimiento",
    desc:  (cu) => `${cu} enviado a mantenimiento.`,
  },
};

function saludSucursal(equiposConFalla: number): "sano" | "atencion" | "critico" {
  if (equiposConFalla === 0) return "sano";
  if (equiposConFalla === 1) return "atencion";
  return "critico";
}

export function EquiposClient({
  equipos: initialEquipos,
  sucursales,
  puedeFiltraSucursal,
}: EquiposClientProps) {
  const router = useRouter();
  const { sucursalId, setSucursalId } = useGlobalFilters();
  const [busqueda, setBusqueda]         = useState("");
  const [soloFallas, setSoloFallas]     = useState(false);
  const [equipos, setEquipos]           = useState<EquipoConRelaciones[]>(initialEquipos);
  const [selectedEq, setSelectedEq]     = useState<EquipoConRelaciones | null>(null);
  const [modalNuevo, setModalNuevo]     = useState(false);

  // Sync after router.refresh()
  useEffect(() => { setEquipos(initialEquipos); }, [initialEquipos]);

  const conteoSucursal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const eq of equipos) {
      const sid = eq.sucursal.id;
      map[sid] = (map[sid] ?? 0) + 1;
    }
    return map;
  }, [equipos]);

  const filtrados = useMemo(() => {
    return equipos.filter((eq) => {
      if (sucursalId && eq.sucursal.id !== sucursalId) return false;
      if (soloFallas && eq.estado !== "FALLA" && eq.estado !== "MANTENIMIENTO") return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          eq.cu.toLowerCase().includes(q) ||
          eq.tipo.toLowerCase().includes(q) ||
          eq.marca.toLowerCase().includes(q) ||
          eq.modelo.toLowerCase().includes(q) ||
          eq.area.toLowerCase().includes(q) ||
          eq.sucursal.nombre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [equipos, sucursalId, busqueda, soloFallas]);

  async function handleTransition(equipoId: string, nextEstado: string) {
    const prev = equipos;

    // Optimistic update
    const applyUpdate = (list: EquipoConRelaciones[]) =>
      list.map((eq) =>
        eq.id === equipoId
          ? { ...eq, estado: nextEstado as EquipoConRelaciones["estado"] }
          : eq
      );

    setEquipos(applyUpdate);
    setSelectedEq((s) => s?.id === equipoId ? applyUpdate([s])[0] ?? null : s);

    const result = await transitionEquipo(equipoId, nextEstado);

    if (!result.ok) {
      setEquipos(prev);
      setSelectedEq(null);
      toast.error("Error", { description: result.error });
      return;
    }

    const eq   = prev.find((e) => e.id === equipoId);
    const meta = (TRANSITION_TOAST as Record<string, { title: string; desc: (cu: string) => string } | undefined>)[nextEstado];
    if (eq && meta) toast.success(meta.title, { description: meta.desc(eq.cu) });

    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Selector de sucursal */}
        {puedeFiltraSucursal && (
          <div className="flex flex-wrap items-center gap-2">
            <SucChip active={sucursalId === null} onClick={() => setSucursalId(null)}>
              Todas las sucursales
            </SucChip>
            {sucursales.map((s) => (
              <SucChip
                key={s.id}
                active={sucursalId === s.id}
                onClick={() => setSucursalId(sucursalId === s.id ? null : s.id)}
                salud={saludSucursal(s.equiposConFalla)}
              >
                {shortenSucursal(s.nombre)}
              </SucChip>
            ))}
          </div>
        )}

        {/* Desglose por sucursal */}
        {sucursalId === null && puedeFiltraSucursal && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {sucursales.map((s) => {
              const total = conteoSucursal[s.id] ?? 0;
              const salud = saludSucursal(s.equiposConFalla);
              return (
                <button
                  key={s.id}
                  onClick={() => setSucursalId(s.id)}
                  className="flex flex-col items-start rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-left transition-colors hover:border-brand-blue/30 hover:bg-brand-blue-light"
                >
                  <span
                    className={[
                      "mb-1.5 h-1.5 w-1.5 rounded-full",
                      salud === "sano" ? "bg-status-ok" : salud === "atencion" ? "bg-status-warn-mid" : "bg-status-danger-mid",
                    ].join(" ")}
                  />
                  <span className="text-xs font-medium leading-tight text-text-primary">
                    {shortenSucursal(s.nombre)}
                  </span>
                  <span className="mt-1 text-xs text-text-tertiary">
                    {total} equipo{total !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              placeholder="Buscar por CU, tipo, marca, área…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSoloFallas(!soloFallas)}
            className={[
              "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              soloFallas
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            <SlidersHorizontal size={13} />
            Solo con falla
          </button>
          <span className="ml-auto text-sm text-text-tertiary">
            {filtrados.length} de {equipos.length}
          </span>
          <button
            onClick={() => setModalNuevo(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            <Plus size={13} />
            Nuevo equipo
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                {["CU", "Tipo", "Área", "Marca / Modelo", "Sucursal", "Criticidad", "Estado", "Últ. Mant."].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-text-tertiary">
                    No hay equipos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((eq) => {
                  const isSelected = selectedEq?.id === eq.id;
                  return (
                    <tr
                      key={eq.id}
                      onClick={() => setSelectedEq(eq)}
                      className={[
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-brand-blue-light" : "hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-tertiary">
                        {eq.cu}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {eq.tipo}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {eq.area}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-text-primary">{eq.marca}</div>
                        <div className="text-[10px] text-text-tertiary">{eq.modelo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge sucursal={eq.sucursal.nombre} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={CRITICIDAD_TONE[eq.criticidad]} dot>
                          {eq.criticidad.charAt(0) + eq.criticidad.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ESTADO_TONE[eq.estado]}>{ESTADO_LABEL[eq.estado]}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-text-tertiary">
                        {eq.ultMant
                          ? format(new Date(eq.ultMant), "d MMM yyyy", { locale: es })
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EquipoDrawer
        equipo={selectedEq}
        onClose={() => setSelectedEq(null)}
        onTransition={handleTransition}
      />

      <NuevoEquipoModal
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        sucursales={sucursales}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
