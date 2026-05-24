"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalFilters } from "@/lib/stores/filters";
import { ZonaFilter } from "@/components/atoms/zona-filter";
import type { ZonaOpt } from "@/components/atoms/zona-filter";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";
import { shortenSucursal } from "@/lib/utils";
import type { OrdenTrabajo } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { OtDrawer } from "@/components/views/ordenes/ot-drawer";
import type { OrdenConRelaciones, BitacoraEntry, FacturaEntry } from "@/components/views/ordenes/ot-drawer";
import { NuevaOTModal } from "@/components/modals/nueva-ot-modal";
import { transitionOT, asignarTecnico, agregarEvidenciaOT } from "@/lib/actions/ot";

export type { OrdenConRelaciones };

type SucursalResumen = {
  id: string;
  nombre: string;
  zonaId: string | null;
  equiposConFalla: number;
};

type EquipoOption  = { id: string; cu: string; tipo: string; area: string };
type TecnicoOption = { id: string; nombre: string; iniciales: string };

interface OrdenesClientProps {
  ordenes: OrdenConRelaciones[];
  sucursales: SucursalResumen[];
  zonas: ZonaOpt[];
  puedeFiltraSucursal: boolean;
  equiposPorSucursal: Record<string, EquipoOption[]>;
  tecnicos: TecnicoOption[];
}

const TIPO_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo", PREDICTIVO: "Predictivo",
};
const TIPO_TONE: Record<string, "info" | "danger" | "purple"> = {
  PREVENTIVO: "info", CORRECTIVO: "danger", PREDICTIVO: "purple",
};
const PRIORIDAD_TONE: Record<string, "danger" | "warn" | "ok"> = {
  ALTA: "danger", MEDIA: "warn", BAJA: "ok",
};
const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADA: "Programada", ASIGNADA: "Asignada",
  EN_PROCESO: "En proceso", CERRADA: "Cerrada", CANCELADA: "Cancelada",
};
const ESTADO_TONE: Record<string, "gray" | "info" | "warn" | "ok"> = {
  PROGRAMADA: "gray", ASIGNADA: "info", EN_PROCESO: "warn",
  CERRADA: "ok", CANCELADA: "gray",
};

const TRANSITION_TOAST: Record<string, { title: string; desc: (num: string) => string }> = {
  ASIGNADA:   { title: "OT asignada",  desc: (n) => `${n} marcada como asignada.`   },
  EN_PROCESO: { title: "OT iniciada",  desc: (n) => `${n} marcada como En proceso.` },
  CERRADA:    { title: "OT cerrada",   desc: (n) => `${n} cerrada correctamente.`    },
  CANCELADA:  { title: "OT cancelada", desc: (n) => `${n} ha sido cancelada.`        },
};

function saludSucursal(n: number): "sano" | "atencion" | "critico" {
  return n === 0 ? "sano" : n === 1 ? "atencion" : "critico";
}

export function OrdenesClient({
  ordenes: initialOrdenes,
  sucursales,
  zonas,
  puedeFiltraSucursal,
  equiposPorSucursal,
  tecnicos,
}: OrdenesClientProps) {
  const router = useRouter();
  const { zonaId, sucursalId, setSucursalId } = useGlobalFilters();
  const [busqueda, setBusqueda]         = useState("");
  const [soloActivas, setSoloActivas]   = useState(false);
  const [ordenes, setOrdenes]           = useState<OrdenConRelaciones[]>(initialOrdenes);
  const [selectedOT, setSelectedOT]     = useState<OrdenConRelaciones | null>(null);
  const [modalNuevaOT, setModalNuevaOT] = useState(false);

  // Sync after router.refresh()
  useEffect(() => { setOrdenes(initialOrdenes); }, [initialOrdenes]);

  const conteoSucursal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ot of ordenes) {
      const sid = ot.equipo.sucursal.id;
      map[sid] = (map[sid] ?? 0) + 1;
    }
    return map;
  }, [ordenes]);

  const sucursalesEnZona = useMemo(() =>
    zonaId ? new Set(sucursales.filter((s) => s.zonaId === zonaId).map((s) => s.id)) : null,
  [zonaId, sucursales]);

  const filtradas = useMemo(() => {
    return ordenes.filter((ot) => {
      const sid = ot.equipo.sucursal.id;
      if (sucursalesEnZona && !sucursalesEnZona.has(sid)) return false;
      if (sucursalId && sid !== sucursalId) return false;
      if (soloActivas && (ot.estado === "CERRADA" || ot.estado === "CANCELADA")) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          ot.numero.toLowerCase().includes(q) ||
          ot.titulo.toLowerCase().includes(q) ||
          ot.equipo.tipo.toLowerCase().includes(q) ||
          ot.equipo.sucursal.nombre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ordenes, sucursalId, busqueda, soloActivas]);

  async function handleTransition(otId: string, nextEstado: string) {
    const now  = new Date();
    const prev = ordenes;

    // Optimistic update
    const applyUpdate = (list: OrdenConRelaciones[]) =>
      list.map((ot) => {
        if (ot.id !== otId) return ot;
        return {
          ...ot,
          estado:   nextEstado as OrdenTrabajo["estado"],
          iniciada: nextEstado === "EN_PROCESO" ? now : ot.iniciada,
          cerrada:  nextEstado === "CERRADA"    ? now : ot.cerrada,
        };
      });

    setOrdenes(applyUpdate);
    setSelectedOT((s) => s?.id === otId ? applyUpdate([s])[0] ?? null : s);

    const result = await transitionOT(otId, nextEstado);

    if (!result.ok) {
      setOrdenes(prev);
      setSelectedOT(null);
      toast.error("Error", { description: result.error });
      return;
    }

    const ot       = prev.find((o) => o.id === otId);
    const toastMeta = TRANSITION_TOAST[nextEstado];
    if (ot && toastMeta) {
      toast.success(toastMeta.title, { description: toastMeta.desc(ot.numero) });
    }
    if (nextEstado === "CERRADA" || nextEstado === "CANCELADA") {
      setTimeout(() => setSelectedOT(null), 400);
    }
    router.refresh();
  }

  function handleEvidenciasAdded(otId: string, urls: string[]) {
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId ? { ...ot, evidencias: [...ot.evidencias, ...urls] } : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId ? { ...s, evidencias: [...s.evidencias, ...urls] } : s
    );
    agregarEvidenciaOT(otId, urls).then((r) => {
      if (!r.ok) toast.error("Error", { description: r.error });
      else toast.success(`${urls.length} foto${urls.length > 1 ? "s" : ""} guardada${urls.length > 1 ? "s" : ""}`);
    });
  }

  function handleCostosUpdated(otId: string, estimado: number | null, real: number | null) {
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId ? { ...ot, costoEstimado: estimado as any, costo: real as any } : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId ? { ...s, costoEstimado: estimado as any, costo: real as any } : s
    );
  }

  function handleFacturaAdded(otId: string, factura: FacturaEntry) {
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId ? { ...ot, facturas: [...ot.facturas, factura] } : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId ? { ...s, facturas: [...s.facturas, factura] } : s
    );
  }

  function handleFacturaUpdated(otId: string, facturaId: string, changes: Partial<FacturaEntry>) {
    const apply = (list: FacturaEntry[]) =>
      list.map((f) => (f.id === facturaId ? { ...f, ...changes } : f));
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId ? { ...ot, facturas: apply(ot.facturas) } : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId ? { ...s, facturas: apply(s.facturas) } : s
    );
  }

  function handleBitacoraAdded(otId: string, entry: BitacoraEntry) {
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId ? { ...ot, bitacora: [...ot.bitacora, entry] } : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId ? { ...s, bitacora: [...s.bitacora, entry] } : s
    );
  }

  async function handleAsignar(otId: string, tecnicoId: string | null) {
    const tecnico = tecnicoId ? tecnicos.find((t) => t.id === tecnicoId) ?? null : null;
    setOrdenes((prev) =>
      prev.map((ot) =>
        ot.id === otId
          ? { ...ot, tecnico: tecnico ? { nombre: tecnico.nombre, iniciales: tecnico.iniciales } : null }
          : ot
      )
    );
    setSelectedOT((s) =>
      s?.id === otId
        ? { ...s, tecnico: tecnico ? { nombre: tecnico.nombre, iniciales: tecnico.iniciales } : null }
        : s
    );
    const result = await asignarTecnico(otId, tecnicoId);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    toast.success(tecnico ? `Técnico asignado: ${tecnico.nombre}` : "Técnico removido");
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
                  <span className="text-xs font-medium text-text-primary leading-tight">
                    {shortenSucursal(s.nombre)}
                  </span>
                  <span className="mt-1 text-xs text-text-tertiary">
                    {total} orden{total !== 1 ? "es" : ""}
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
            {filtradas.length} de {ordenes.length}
          </span>
          <button
            onClick={() => setModalNuevaOT(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
          >
            <Plus size={13} />
            Nueva OT
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                {["Número", "Título", "Tipo", "Equipo", "Sucursal", "Prioridad", "Estado", "Técnico", "Programada"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-text-tertiary">
                    No hay órdenes que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((ot) => {
                  const isSelected = selectedOT?.id === ot.id;
                  return (
                    <tr
                      key={ot.id}
                      onClick={() => setSelectedOT(ot)}
                      className={[
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-brand-blue-light" : "hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-tertiary">
                        {ot.numero}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="line-clamp-2 font-medium text-text-primary">{ot.titulo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TIPO_TONE[ot.tipo]}>{TIPO_LABEL[ot.tipo]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="text-xs font-medium">{ot.equipo.tipo}</div>
                        <div className="font-mono text-[10px] text-text-tertiary">{ot.equipo.cu}</div>
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge sucursal={ot.equipo.sucursal.nombre} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={PRIORIDAD_TONE[ot.prioridad]} dot>
                          {ot.prioridad.charAt(0) + ot.prioridad.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ESTADO_TONE[ot.estado]}>{ESTADO_LABEL[ot.estado]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {ot.tecnico ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-semibold text-brand-blue">
                              {ot.tecnico.iniciales}
                            </span>
                            <span className="max-w-[70px] truncate text-xs text-text-secondary">
                              {ot.tecnico.nombre.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-text-tertiary">
                        {format(new Date(ot.programada), "d MMM", { locale: es })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OtDrawer
        ot={selectedOT}
        tecnicos={tecnicos}
        onClose={() => setSelectedOT(null)}
        onTransition={handleTransition}
        onAsignar={handleAsignar}
        onEvidenciasAdded={handleEvidenciasAdded}
        onBitacoraAdded={handleBitacoraAdded}
        onCostosUpdated={handleCostosUpdated}
        onFacturaAdded={handleFacturaAdded}
        onFacturaUpdated={handleFacturaUpdated}
      />

      <NuevaOTModal
        open={modalNuevaOT}
        onClose={() => setModalNuevaOT(false)}
        sucursales={sucursales}
        equiposPorSucursal={equiposPorSucursal}
        tecnicos={tecnicos}
      />
    </>
  );
}
