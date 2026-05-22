"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalFilters } from "@/lib/stores/filters";
import { SucChip } from "@/components/atoms/suc-chip";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";
import { shortenSucursal } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { PmDrawer, calcNextProx } from "@/components/views/preventivos/pm-drawer";
import type { PreventivoConRelaciones } from "@/components/views/preventivos/pm-drawer";
import { NuevoPMModal } from "@/components/views/preventivos/nuevo-pm-modal";
import { completarPM } from "@/lib/actions/preventivo";

export type { PreventivoConRelaciones };

type SucursalResumen = {
  id: string;
  nombre: string;
  equiposConFalla: number;
};

type EquipoOption  = { id: string; cu: string; tipo: string; sucursalId: string; sucursalNombre: string };
type TecnicoOption = { id: string; nombre: string; iniciales: string };

interface PreventivoClientProps {
  preventivos: PreventivoConRelaciones[];
  sucursales:  SucursalResumen[];
  equipos:     EquipoOption[];
  tecnicos:    TecnicoOption[];
  puedeFiltraSucursal: boolean;
}

const FRECUENCIA_LABEL: Record<string, string> = {
  SEMANAL:    "Semanal",
  QUINCENAL:  "Quincenal",
  MENSUAL:    "Mensual",
  BIMESTRAL:  "Bimestral",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL:  "Semestral",
  ANUAL:      "Anual",
};

const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADO: "Programado",
  PROXIMO:    "Próximo",
  VENCIDO:    "Vencido",
  COMPLETADO: "Completado",
};

const ESTADO_TONE: Record<string, "gray" | "warn" | "danger" | "ok"> = {
  PROGRAMADO: "gray",
  PROXIMO:    "warn",
  VENCIDO:    "danger",
  COMPLETADO: "ok",
};

function saludSucursal(equiposConFalla: number): "sano" | "atencion" | "critico" {
  if (equiposConFalla === 0) return "sano";
  if (equiposConFalla === 1) return "atencion";
  return "critico";
}

export function PreventivoClient({
  preventivos: initialPreventivos,
  sucursales,
  equipos,
  tecnicos,
  puedeFiltraSucursal,
}: PreventivoClientProps) {
  const router = useRouter();
  const { sucursalId, setSucursalId } = useGlobalFilters();
  const [busqueda, setBusqueda]         = useState("");
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [preventivos, setPreventivos]   = useState<PreventivoConRelaciones[]>(initialPreventivos);
  const [selectedPm, setSelectedPm]     = useState<PreventivoConRelaciones | null>(null);
  const [modalNuevo, setModalNuevo]     = useState(false);

  // Sync after router.refresh()
  useEffect(() => { setPreventivos(initialPreventivos); }, [initialPreventivos]);

  const conteoSucursal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pm of preventivos) {
      const sid = pm.equipo.sucursal.id;
      map[sid] = (map[sid] ?? 0) + 1;
    }
    return map;
  }, [preventivos]);

  const filtrados = useMemo(() => {
    return preventivos.filter((pm) => {
      if (sucursalId && pm.equipo.sucursal.id !== sucursalId) return false;
      if (soloUrgentes && pm.estado !== "VENCIDO" && pm.estado !== "PROXIMO") return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          pm.codigo.toLowerCase().includes(q) ||
          pm.tarea.toLowerCase().includes(q) ||
          pm.equipo.tipo.toLowerCase().includes(q) ||
          pm.equipo.sucursal.nombre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [preventivos, sucursalId, busqueda, soloUrgentes]);

  async function handleCompletar(pmId: string) {
    const pm = preventivos.find((p) => p.id === pmId);
    if (!pm) return;

    const nextDate = calcNextProx(pm.frecuencia, new Date());
    const prev     = preventivos;

    // Optimistic update
    setPreventivos((list) =>
      list.map((p) =>
        p.id === pmId ? { ...p, estado: "COMPLETADO" as const, prox: nextDate } : p
      )
    );
    setSelectedPm((s) =>
      s?.id === pmId ? { ...s, estado: "COMPLETADO" as const, prox: nextDate } : s
    );

    const result = await completarPM(pmId);

    if (!result.ok) {
      setPreventivos(prev);
      setSelectedPm(null);
      toast.error("Error", { description: result.error });
      return;
    }

    toast.success("PM completado", {
      description: `${pm.codigo} registrado. Próxima ejecución: ${format(nextDate, "d 'de' MMMM yyyy", { locale: es })}.`,
    });

    setTimeout(() => setSelectedPm(null), 400);
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
                    {total} PM{total !== 1 ? "s" : ""}
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
              placeholder="Buscar por código, tarea, equipo…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSoloUrgentes(!soloUrgentes)}
            className={[
              "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              soloUrgentes
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            <SlidersHorizontal size={13} />
            Vencidos / próximos
          </button>
          <span className="ml-auto text-sm text-text-tertiary">
            {filtrados.length} de {preventivos.length}
          </span>
          <button
            onClick={() => setModalNuevo(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            <Plus size={13} />
            Nuevo PM
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                {["Código", "Tarea", "Equipo", "Sucursal", "Frecuencia", "Estado", "Próxima fecha", "Técnico"].map((h) => (
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
                    No hay preventivos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((pm) => {
                  const isSelected = selectedPm?.id === pm.id;
                  return (
                    <tr
                      key={pm.id}
                      onClick={() => setSelectedPm(pm)}
                      className={[
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-brand-blue-light" : "hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-tertiary">
                        {pm.codigo}
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="line-clamp-2 font-medium text-text-primary">{pm.tarea}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="text-xs font-medium">{pm.equipo.tipo}</div>
                        <div className="font-mono text-[10px] text-text-tertiary">{pm.equipo.cu}</div>
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge sucursal={pm.equipo.sucursal.nombre} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary">{FRECUENCIA_LABEL[pm.frecuencia]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ESTADO_TONE[pm.estado]} dot={pm.estado === "VENCIDO"}>
                          {ESTADO_LABEL[pm.estado]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className={isPast(new Date(pm.prox)) && pm.estado !== "COMPLETADO" ? "font-medium text-status-danger" : "text-text-tertiary"}>
                          {format(new Date(pm.prox), "d MMM yyyy", { locale: es })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {pm.tecnico ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-semibold text-brand-blue">
                              {pm.tecnico.iniciales}
                            </span>
                            <span className="max-w-[70px] truncate text-xs text-text-secondary">
                              {pm.tecnico.nombre.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PmDrawer
        pm={selectedPm}
        onClose={() => setSelectedPm(null)}
        onCompletar={handleCompletar}
      />

      <NuevoPMModal
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        equipos={equipos}
        tecnicos={tecnicos}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
