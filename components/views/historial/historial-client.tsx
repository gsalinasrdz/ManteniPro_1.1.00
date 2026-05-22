"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";

export type TipoObjeto = "ot" | "incidencia" | "preventivo" | "equipo" | "inventario";

export type EntradaActividad = {
  id: string;
  actorNombre: string;
  actorIniciales: string;
  accion: string;
  objeto: string;
  tipoObjeto: TipoObjeto;
  descripcion?: string;
  sucursal?: string;
  createdAt: Date;
};

interface HistorialClientProps {
  entradas: EntradaActividad[];
}

// ── Visual maps ──────────────────────────────────────────────

const TIPO_CHIP: Record<TipoObjeto, string> = {
  ot:         "bg-status-info-bg text-status-info",
  incidencia: "bg-status-warn-bg text-status-warn",
  preventivo: "bg-[#EDE7F6] text-[#5B3A91]",
  equipo:     "bg-bg-tertiary text-text-secondary",
  inventario: "bg-status-ok-bg text-status-ok",
};

const TIPO_DOT: Record<TipoObjeto, string> = {
  ot:         "bg-status-info",
  incidencia: "bg-status-warn-mid",
  preventivo: "bg-[#7B4FBF]",
  equipo:     "bg-text-tertiary",
  inventario: "bg-status-ok",
};

const FILTROS: { key: TipoObjeto | "todos"; label: string }[] = [
  { key: "todos",      label: "Todos" },
  { key: "ot",         label: "Órdenes de trabajo" },
  { key: "incidencia", label: "Incidencias" },
  { key: "preventivo", label: "Preventivos" },
  { key: "equipo",     label: "Equipos" },
  { key: "inventario", label: "Inventario" },
];

// ── Helpers ──────────────────────────────────────────────────

function dateLabel(date: Date): string {
  if (isToday(date))     return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' MMMM yyyy", { locale: es });
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function timeLabel(date: Date): string {
  return format(date, "HH:mm");
}

// ── Component ────────────────────────────────────────────────

export function HistorialClient({ entradas }: HistorialClientProps) {
  const [filtro, setFiltro]     = useState<TipoObjeto | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");

  const kpis = useMemo(() => {
    const hoy    = entradas.filter((e) => isToday(e.createdAt)).length;
    const actores = new Set(entradas.map((e) => e.actorNombre)).size;
    return { total: entradas.length, hoy, actores };
  }, [entradas]);

  const filtradas = useMemo(() => {
    return entradas.filter((e) => {
      if (filtro !== "todos" && e.tipoObjeto !== filtro) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          e.actorNombre.toLowerCase().includes(q) ||
          e.objeto.toLowerCase().includes(q) ||
          e.accion.toLowerCase().includes(q) ||
          (e.descripcion ?? "").toLowerCase().includes(q) ||
          (e.sucursal ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entradas, filtro, busqueda]);

  // Group sorted entries by day
  const grupos = useMemo(() => {
    const sorted = [...filtradas].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const map = new Map<string, { label: string; entradas: EntradaActividad[] }>();
    for (const e of sorted) {
      const key = dateKey(e.createdAt);
      if (!map.has(key)) map.set(key, { label: dateLabel(e.createdAt), entradas: [] });
      map.get(key)!.entradas.push(e);
    }
    return Array.from(map.values());
  }, [filtradas]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total eventos",  value: kpis.total   },
          { label: "Hoy",            value: kpis.hoy     },
          { label: "Actores únicos", value: kpis.actores },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-bg-primary px-4 py-3.5">
            <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</div>
            <div className="mt-2 text-3xl font-medium tracking-tight text-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              filtro === key
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            )}
          >
            {key !== "todos" && (
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                filtro === key ? "bg-white/80" : TIPO_DOT[key as TipoObjeto]
              )} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            placeholder="Buscar por actor, referencia, acción…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
          />
        </div>
        <span className="ml-auto text-sm text-text-tertiary">
          {filtradas.length} de {entradas.length} eventos
        </span>
      </div>

      {/* Timeline */}
      {grupos.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-bg-primary">
          <p className="text-sm text-text-tertiary">No hay actividad que coincida con los filtros.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <section key={grupo.label}>
              {/* Date divider */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-semibold text-text-secondary">{grupo.label}</span>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-tertiary">{grupo.entradas.length} evento{grupo.entradas.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Entries */}
              <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
                {grupo.entradas.map((e, idx) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary",
                      idx < grupo.entradas.length - 1 && "border-b border-border"
                    )}
                  >
                    {/* Timeline dot + avatar */}
                    <div className="relative flex flex-col items-center pt-0.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-semibold text-brand-blue">
                        {e.actorIniciales}
                      </div>
                      {idx < grupo.entradas.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: "12px" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary">{e.actorNombre}</span>
                        <span className="text-sm text-text-secondary">{e.accion}</span>
                        <span className={cn(
                          "rounded px-1.5 py-px font-mono text-xs font-medium",
                          TIPO_CHIP[e.tipoObjeto]
                        )}>
                          {e.objeto}
                        </span>
                        {e.sucursal && (
                          <span className="text-xs text-text-tertiary">
                            · {e.sucursal.replace("Sabor Express ", "")}
                          </span>
                        )}
                      </div>
                      {e.descripcion && (
                        <p className="text-xs text-text-tertiary">{e.descripcion}</p>
                      )}
                    </div>

                    {/* Time */}
                    <span className="shrink-0 pt-1 font-mono text-xs text-text-tertiary">
                      {timeLabel(e.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
