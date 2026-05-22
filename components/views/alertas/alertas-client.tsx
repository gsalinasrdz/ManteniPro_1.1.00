"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Boxes,
  Wrench,
  AlertCircle,
  Package,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export type TipoAlerta = "equipo" | "preventivo" | "incidencia" | "inventario" | "ot";
export type SeveridadAlerta = "critica" | "alta" | "media";

export type Alerta = {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  descripcion: string;
  referencia: string;
  sucursal?: string;
  href: string;
  createdAt: Date;
};

interface AlertasClientProps {
  alertas: Alerta[];
}

// ── Visual maps ──────────────────────────────────────────────

const TIPO_ICON: Record<TipoAlerta, React.ElementType> = {
  equipo:     Boxes,
  preventivo: Wrench,
  incidencia: AlertCircle,
  inventario: Package,
  ot:         ClipboardList,
};

const TIPO_LABEL: Record<TipoAlerta, string> = {
  equipo:     "Equipo",
  preventivo: "Preventivo",
  incidencia: "Incidencia",
  inventario: "Inventario",
  ot:         "Orden de trabajo",
};

const SEV_ACCENT: Record<SeveridadAlerta, string> = {
  critica: "bg-status-danger-mid",
  alta:    "bg-status-warn-mid",
  media:   "bg-brand-blue-mid",
};

const SEV_ICON_BG: Record<SeveridadAlerta, string> = {
  critica: "bg-status-danger-bg text-status-danger",
  alta:    "bg-status-warn-bg text-status-warn",
  media:   "bg-status-info-bg text-status-info",
};

const SEV_TONE: Record<SeveridadAlerta, "danger" | "warn" | "info"> = {
  critica: "danger",
  alta:    "warn",
  media:   "info",
};

const SEV_LABEL: Record<SeveridadAlerta, string> = {
  critica: "Crítica",
  alta:    "Alta",
  media:   "Media",
};

const SEV_ORDER: Record<SeveridadAlerta, number> = {
  critica: 0,
  alta:    1,
  media:   2,
};

// ── Filters ──────────────────────────────────────────────────

const FILTROS: { key: TipoAlerta | "todos"; label: string }[] = [
  { key: "todos",      label: "Todas" },
  { key: "equipo",     label: "Equipos" },
  { key: "incidencia", label: "Incidencias" },
  { key: "preventivo", label: "Preventivos" },
  { key: "inventario", label: "Inventario" },
  { key: "ot",         label: "Órdenes de trabajo" },
];

// ── Component ────────────────────────────────────────────────

function AlertaCard({ alerta }: { alerta: Alerta }) {
  const router = useRouter();
  const Icon = TIPO_ICON[alerta.tipo];

  return (
    <div className="relative flex overflow-hidden rounded-lg border border-border bg-bg-primary transition-shadow hover:shadow-sm">
      {/* accent bar */}
      <div className={cn("w-1 shrink-0", SEV_ACCENT[alerta.severidad])} />

      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        {/* icon */}
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", SEV_ICON_BG[alerta.severidad])}>
          <Icon size={15} />
        </div>

        {/* body */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text-primary leading-snug">{alerta.titulo}</span>
            <Badge tone={SEV_TONE[alerta.severidad]} dot>
              {SEV_LABEL[alerta.severidad]}
            </Badge>
            <Badge tone="gray">{TIPO_LABEL[alerta.tipo]}</Badge>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">{alerta.descripcion}</p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-text-tertiary">{alerta.referencia}</span>
            {alerta.sucursal && <LocationBadge sucursal={alerta.sucursal} />}
            <span className="text-xs text-text-tertiary">
              Hace {formatDistanceToNow(alerta.createdAt, { locale: es })}
            </span>
          </div>
        </div>

        {/* action */}
        <button
          onClick={() => router.push(alerta.href)}
          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-blue-pale hover:bg-brand-blue-light hover:text-brand-blue"
        >
          Ver
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

export function AlertasClient({ alertas }: AlertasClientProps) {
  const [filtro, setFiltro] = useState<TipoAlerta | "todos">("todos");

  const kpis = useMemo(() => ({
    total:   alertas.length,
    critica: alertas.filter((a) => a.severidad === "critica").length,
    alta:    alertas.filter((a) => a.severidad === "alta").length,
    media:   alertas.filter((a) => a.severidad === "media").length,
  }), [alertas]);

  const filtradas = useMemo(() => {
    const base = filtro === "todos" ? alertas : alertas.filter((a) => a.tipo === filtro);
    return [...base].sort((a, b) => SEV_ORDER[a.severidad] - SEV_ORDER[b.severidad]);
  }, [alertas, filtro]);

  const criticas  = filtradas.filter((a) => a.severidad === "critica");
  const restantes = filtradas.filter((a) => a.severidad !== "critica");

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total alertas",   value: kpis.total,   tone: "default" as const },
          { label: "Críticas",        value: kpis.critica, tone: "danger"  as const },
          { label: "Altas",           value: kpis.alta,    tone: "warn"    as const },
          { label: "Medias",          value: kpis.media,   tone: "default" as const },
        ].map(({ label, value, tone }) => (
          <div
            key={label}
            className={cn(
              "rounded-lg border bg-bg-primary px-4 py-3.5",
              tone === "danger" ? "border-status-danger-bg" :
              tone === "warn"   ? "border-status-warn-bg"   :
              "border-border"
            )}
          >
            <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</div>
            <div className={cn(
              "mt-2 text-3xl font-medium tracking-tight",
              tone === "danger" ? "text-status-danger" :
              tone === "warn"   ? "text-status-warn"   :
              "text-text-primary"
            )}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              filtro === key
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            )}
          >
            {label}
            {key !== "todos" && (
              <span className={cn(
                "ml-1.5 rounded-full px-1.5 text-[10px] font-semibold",
                filtro === key ? "bg-white/20 text-white" : "bg-bg-tertiary text-text-tertiary"
              )}>
                {alertas.filter((a) => a.tipo === key).length}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-sm text-text-tertiary">
          {filtradas.length} alerta{filtradas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Feed */}
      {filtradas.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-bg-primary">
          <div className="flex flex-col items-center gap-1.5">
            <AlertTriangle size={20} className="text-text-tertiary" />
            <p className="text-sm text-text-tertiary">No hay alertas en esta categoría.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {criticas.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-status-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-status-danger-mid" />
                Críticas — acción inmediata
              </h3>
              <div className="flex flex-col gap-2">
                {criticas.map((a) => <AlertaCard key={a.id} alerta={a} />)}
              </div>
            </section>
          )}
          {restantes.length > 0 && (
            <section>
              {criticas.length > 0 && (
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                  Altas y medias
                </h3>
              )}
              <div className="flex flex-col gap-2">
                {restantes.map((a) => <AlertaCard key={a.id} alerta={a} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
