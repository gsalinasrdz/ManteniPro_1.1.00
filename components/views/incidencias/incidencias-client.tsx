"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalFilters } from "@/lib/stores/filters";
import { ZonaFilter } from "@/components/atoms/zona-filter";
import type { ZonaOpt } from "@/components/atoms/zona-filter";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";
import { cn, shortenSucursal } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Incidencia } from "@prisma/client";
import { IncidenciaDrawer } from "@/components/views/incidencias/incidencia-drawer";
import type { IncidenciaConRelaciones } from "@/components/views/incidencias/incidencia-drawer";
import { ReportarIncidenciaModal } from "@/components/modals/reportar-incidencia-modal";
import { transitionIncidencia, generarOTDesdeIncidencia } from "@/lib/actions/incidencia";

export type { IncidenciaConRelaciones };

type SucursalResumen = {
  id: string;
  nombre: string;
  zonaId: string | null;
  equiposConFalla: number;
};

type EquipoOption = { id: string; cu: string; tipo: string; area: string };

interface IncidenciasClientProps {
  incidencias: IncidenciaConRelaciones[];
  sucursales:  SucursalResumen[];
  zonas:       ZonaOpt[];
  puedeFiltraSucursal: boolean;
  equiposPorSucursal: Record<string, EquipoOption[]>;
  esTrabajador?: boolean;
}

// ── Visual maps ────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  EVALUACION:  "Evaluación",
  EN_ATENCION: "En atención",
  CERRADA:     "Cerrada",
  DESCARTADA:  "Descartada",
};

const ESTADO_TONE: Record<string, "warn" | "info" | "ok" | "gray"> = {
  EVALUACION:  "warn",
  EN_ATENCION: "info",
  CERRADA:     "ok",
  DESCARTADA:  "gray",
};

const SEVERIDAD_TONE: Record<string, "danger" | "warn" | "ok"> = {
  ALTA: "danger", MEDIA: "warn", BAJA: "ok",
};

const TRANSITION_TOAST: Record<string, { title: string; desc: (num: string) => string }> = {
  EN_ATENCION: {
    title: "Incidencia en atención",
    desc:  (n) => `${n} tomada en atención.`,
  },
  CERRADA: {
    title: "Incidencia cerrada",
    desc:  (n) => `${n} marcada como resuelta.`,
  },
  DESCARTADA: {
    title: "Incidencia descartada",
    desc:  (n) => `${n} descartada sin generar OT.`,
  },
};

function saludSucursal(n: number): "sano" | "atencion" | "critico" {
  return n === 0 ? "sano" : n === 1 ? "atencion" : "critico";
}

// ── Component ──────────────────────────────────────────────────

export function IncidenciasClient({
  incidencias: initialIncidencias,
  sucursales,
  zonas,
  puedeFiltraSucursal,
  equiposPorSucursal,
  esTrabajador = false,
}: IncidenciasClientProps) {
  const router = useRouter();
  const { zonaId, sucursalId, setSucursalId } = useGlobalFilters();
  const [busqueda, setBusqueda]           = useState("");
  const [soloActivas, setSoloActivas]     = useState(false);
  const [modalReportar, setModalReportar] = useState(false);
  const [incidencias, setIncidencias]     = useState<IncidenciaConRelaciones[]>(initialIncidencias);
  const [selectedInc, setSelectedInc]     = useState<IncidenciaConRelaciones | null>(null);

  // Sync after router.refresh()
  useEffect(() => { setIncidencias(initialIncidencias); }, [initialIncidencias]);

  // ── Vista simplificada para TRABAJADOR ────────────────────────
  if (esTrabajador) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-6 py-16">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-text-primary">Reportar una incidencia</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Usa el botón para notificar un problema en tu sucursal.
            </p>
          </div>
          <button
            onClick={() => setModalReportar(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-brand-blue/90"
          >
            <Plus size={15} />
            Reportar incidencia
          </button>
          {incidencias.length > 0 && (
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg-primary">
              <div className="border-b border-border bg-bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Mis reportes recientes
              </div>
              {incidencias.slice(0, 5).map((inc, i) => (
                <div key={inc.id} className={cn("flex items-center gap-3 px-4 py-3", i < Math.min(incidencias.length, 5) - 1 && "border-b border-border")}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-text-primary">{inc.titulo}</div>
                    <div className="text-[10px] text-text-tertiary">{inc.numero} · {formatDistanceToNow(new Date(inc.createdAt), { locale: es, addSuffix: true })}</div>
                  </div>
                  <Badge tone={ESTADO_TONE[inc.estado] ?? "gray"} size="sm">{ESTADO_LABEL[inc.estado] ?? inc.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <ReportarIncidenciaModal
          open={modalReportar}
          onClose={() => { setModalReportar(false); router.refresh(); }}
          sucursales={sucursales}
          equiposPorSucursal={equiposPorSucursal}
        />
      </>
    );
  }

  const conteoSucursal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inc of incidencias) {
      const sid = inc.equipo.sucursal.id;
      map[sid] = (map[sid] ?? 0) + 1;
    }
    return map;
  }, [incidencias]);

  const sucursalesEnZona = useMemo(() =>
    zonaId ? new Set(sucursales.filter((s) => s.zonaId === zonaId).map((s) => s.id)) : null,
  [zonaId, sucursales]);

  const filtradas = useMemo(() => {
    return incidencias.filter((inc) => {
      const sid = inc.equipo.sucursal.id;
      if (sucursalesEnZona && !sucursalesEnZona.has(sid)) return false;
      if (sucursalId && sid !== sucursalId) return false;
      if (soloActivas && (inc.estado === "CERRADA" || inc.estado === "DESCARTADA")) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          inc.numero.toLowerCase().includes(q) ||
          inc.titulo.toLowerCase().includes(q) ||
          inc.equipo.tipo.toLowerCase().includes(q) ||
          inc.equipo.sucursal.nombre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidencias, sucursalesEnZona, sucursalId, busqueda, soloActivas]);

  async function handleTransition(incId: string, nextEstado: string, opts?: { costoEstimado?: number }) {
    const prev = incidencias;

    // GENERAR_OT special action
    if (nextEstado === "GENERAR_OT") {
      // Optimistic: mark ordenId linked + move to EN_ATENCION
      setIncidencias((list) =>
        list.map((i) =>
          i.id === incId ? { ...i, ordenId: "pending", estado: "EN_ATENCION" as Incidencia["estado"] } : i
        )
      );
      setSelectedInc((s) =>
        s?.id === incId ? { ...s, ordenId: "pending", estado: "EN_ATENCION" as Incidencia["estado"] } : s
      );

      const result = await generarOTDesdeIncidencia(incId, opts?.costoEstimado);

      if (!result.ok) {
        setIncidencias(prev);
        setSelectedInc(null);
        toast.error("Error", { description: result.error });
        return;
      }

      const inc = prev.find((i) => i.id === incId);
      toast.success("OT generada", {
        description: `${result.otNumero} creada desde ${inc?.numero ?? "incidencia"}. Ve a Órdenes para asignar técnico.`,
      });
      router.refresh();
      return;
    }

    // Regular estado transition
    setIncidencias((list) =>
      list.map((i) =>
        i.id === incId ? { ...i, estado: nextEstado as Incidencia["estado"] } : i
      )
    );
    setSelectedInc((s) =>
      s?.id === incId ? { ...s, estado: nextEstado as Incidencia["estado"] } : s
    );

    const result = await transitionIncidencia(incId, nextEstado);

    if (!result.ok) {
      setIncidencias(prev);
      setSelectedInc(null);
      toast.error("Error", { description: result.error });
      return;
    }

    const inc  = prev.find((i) => i.id === incId);
    const meta = (TRANSITION_TOAST as Record<string, { title: string; desc: (n: string) => string } | undefined>)[nextEstado];
    if (inc && meta) toast.success(meta.title, { description: meta.desc(inc.numero) });

    if (nextEstado === "CERRADA" || nextEstado === "DESCARTADA") {
      setTimeout(() => setSelectedInc(null), 400);
    }
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Selector de zona y sucursal */}
        <ZonaFilter zonas={zonas} sucursales={sucursales} puedeFiltraSucursal={puedeFiltraSucursal} />

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
                  <span className={[
                    "mb-1.5 h-1.5 w-1.5 rounded-full",
                    salud === "sano" ? "bg-status-ok" : salud === "atencion" ? "bg-status-warn-mid" : "bg-status-danger-mid",
                  ].join(" ")} />
                  <span className="text-xs font-medium leading-tight text-text-primary">
                    {shortenSucursal(s.nombre)}
                  </span>
                  <span className="mt-1 text-xs text-text-tertiary">
                    {total} incidencia{total !== 1 ? "s" : ""}
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
              placeholder="Buscar por número, título, equipo…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSoloActivas(!soloActivas)}
            className={[
              "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              soloActivas
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            <SlidersHorizontal size={13} />
            Solo activas
          </button>
          <span className="ml-auto text-sm text-text-tertiary">
            {filtradas.length} de {incidencias.length}
          </span>
          <button
            onClick={() => setModalReportar(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-status-warn px-3 text-sm font-medium text-white transition-colors hover:bg-status-warn/90"
          >
            <Plus size={13} />
            Reportar
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                {["Número", "Título", "Equipo", "Sucursal", "Severidad", "Estado", "Reportó", "Hace"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-text-tertiary">
                    No hay incidencias que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((inc) => {
                  const isSelected = selectedInc?.id === inc.id;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedInc(inc)}
                      className={[
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-brand-blue-light" : "hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-tertiary">
                        {inc.numero}
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="line-clamp-2 font-medium text-text-primary">
                          {inc.titulo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="text-xs font-medium">{inc.equipo.tipo}</div>
                        <div className="font-mono text-[10px] text-text-tertiary">{inc.equipo.cu}</div>
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge sucursal={inc.equipo.sucursal.nombre} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={SEVERIDAD_TONE[inc.severidad]} dot>
                          {inc.severidad.charAt(0) + inc.severidad.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ESTADO_TONE[inc.estado]}>
                          {ESTADO_LABEL[inc.estado]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-semibold text-brand-blue">
                            {inc.reporta.iniciales}
                          </span>
                          <span className="max-w-[80px] truncate text-xs text-text-secondary">
                            {inc.reporta.nombre.split(" ")[0]}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(inc.createdAt), { locale: es, addSuffix: false })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IncidenciaDrawer
        inc={selectedInc}
        onClose={() => setSelectedInc(null)}
        onTransition={handleTransition}
      />

      <ReportarIncidenciaModal
        open={modalReportar}
        onClose={() => setModalReportar(false)}
        sucursales={sucursales}
        equiposPorSucursal={equiposPorSucursal}
      />
    </>
  );
}
