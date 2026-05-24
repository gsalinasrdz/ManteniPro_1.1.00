"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X, Wrench, MapPin, Gauge, Calendar, Clock,
  CheckCircle2, AlertTriangle, Settings,
  ClipboardList, AlertCircle, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import type { Equipo, Sucursal } from "@prisma/client";
import { getEquipoHistorial } from "@/lib/actions/equipo";
import type { HistorialEntry } from "@/lib/actions/equipo";

// ── Type export ────────────────────────────────────────────────

export type EquipoConRelaciones = Equipo & {
  sucursal: Pick<Sucursal, "id" | "nombre">;
};

// ── Visual maps ────────────────────────────────────────────────

const CRITICIDAD_TONE: Record<string, "danger" | "warn" | "ok"> = {
  ALTA:  "danger",
  MEDIA: "warn",
  BAJA:  "ok",
};

const CRITICIDAD_LABEL: Record<string, string> = {
  ALTA:  "Criticidad Alta",
  MEDIA: "Criticidad Media",
  BAJA:  "Criticidad Baja",
};

const ESTADO_LABEL: Record<string, string> = {
  OPERATIVO:    "Operativo",
  MANTENIMIENTO:"En mantenimiento",
  FALLA:        "Falla activa",
  BAJA:         "Dado de baja",
};

const ESTADO_TONE: Record<string, "ok" | "warn" | "danger" | "gray"> = {
  OPERATIVO:    "ok",
  MANTENIMIENTO:"warn",
  FALLA:        "danger",
  BAJA:         "gray",
};

// ── Status indicator ───────────────────────────────────────────

function EstadoIndicator({ estado }: { estado: string }) {
  if (estado === "OPERATIVO") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-ok/30 bg-status-ok-bg px-3 py-2">
        <CheckCircle2 size={13} className="shrink-0 text-status-ok" />
        <span className="text-xs font-medium text-status-ok">Equipo operativo</span>
      </div>
    );
  }
  if (estado === "FALLA") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 py-2">
        <AlertTriangle size={13} className="shrink-0 text-status-danger" />
        <span className="text-xs font-medium text-status-danger">Falla activa — requiere atención</span>
      </div>
    );
  }
  if (estado === "MANTENIMIENTO") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-warn/30 bg-status-warn-bg px-3 py-2">
        <Settings size={13} className="shrink-0 text-status-warn" />
        <span className="text-xs font-medium text-status-warn">En mantenimiento</span>
      </div>
    );
  }
  return null;
}

// ── Detail row ─────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-tertiary">
        <Icon size={12} className="text-text-tertiary" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
          {label}
        </div>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  );
}

// ── Actions per state ──────────────────────────────────────────

type ActionDef = {
  label:   string;
  next:    string;
  variant: "ok" | "danger" | "warn" | "ghost";
};

function getActions(estado: string): ActionDef[] {
  switch (estado) {
    case "OPERATIVO":
      return [
        { label: "Reportar falla",        next: "FALLA",        variant: "danger" },
        { label: "Enviar a mantenimiento", next: "MANTENIMIENTO", variant: "ghost"  },
      ];
    case "FALLA":
      return [
        { label: "Marcar como operativo",  next: "OPERATIVO",    variant: "ok"    },
        { label: "Enviar a mantenimiento", next: "MANTENIMIENTO", variant: "ghost" },
      ];
    case "MANTENIMIENTO":
      return [
        { label: "Marcar como operativo", next: "OPERATIVO", variant: "ok" },
      ];
    default:
      return [];
  }
}

const ACTION_CLASS: Record<string, string> = {
  ok:      "bg-status-ok text-white hover:bg-status-ok/90",
  danger:  "bg-status-danger-bg text-status-danger border border-status-danger/30 hover:bg-status-danger/10",
  warn:    "bg-status-warn text-white hover:bg-status-warn/90",
  ghost:   "border border-border text-text-secondary hover:bg-bg-secondary",
};

// ── Drawer ─────────────────────────────────────────────────────

interface EquipoDrawerProps {
  equipo:       EquipoConRelaciones | null;
  onClose:      () => void;
  onTransition: (equipoId: string, nextEstado: string) => void;
}

// ── Historial tab ──────────────────────────────────────────────

const OT_ESTADO_TONE: Record<string, string> = {
  PROGRAMADA: "bg-bg-tertiary text-text-tertiary",
  ASIGNADA:   "bg-blue-50 text-brand-blue",
  EN_PROCESO: "bg-status-warn-bg text-status-warn",
  CERRADA:    "bg-status-ok-bg text-status-ok",
  CANCELADA:  "bg-bg-tertiary text-text-tertiary",
};
const INC_ESTADO_TONE: Record<string, string> = {
  EVALUACION:  "bg-status-warn-bg text-status-warn",
  EN_ATENCION: "bg-blue-50 text-brand-blue",
  CERRADA:     "bg-status-ok-bg text-status-ok",
  DESCARTADA:  "bg-bg-tertiary text-text-tertiary",
};

function HistorialTab({ equipoId }: { equipoId: string }) {
  const [historial, setHistorial] = useState<HistorialEntry[] | null>(null);
  const [pending, start]          = useTransition();

  useEffect(() => {
    start(async () => {
      const res = await getEquipoHistorial(equipoId);
      if (res.ok) setHistorial(res.data ?? []);
    });
  }, [equipoId]);

  if (pending || historial === null) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 size={18} className="animate-spin text-text-tertiary" />
      </div>
    );
  }
  if (historial.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-text-tertiary">
        <ClipboardList size={22} className="opacity-40" />
        <p className="text-xs">Sin historial de OTs ni incidencias</p>
      </div>
    );
  }

  const costoTotal = historial
    .filter((e) => e.tipo === "ot" && e.costo)
    .reduce((s, e) => s + (e.costo ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      {costoTotal > 0 && (
        <div className="rounded-lg border border-border bg-bg-secondary px-4 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Costo acumulado OTs</span>
          <div className="mt-0.5 text-sm font-semibold text-text-primary">
            ${costoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}
      {historial.map((e) => {
        const isOT   = e.tipo === "ot";
        const tone   = isOT ? (OT_ESTADO_TONE[e.estado] ?? "") : (INC_ESTADO_TONE[e.estado] ?? "");
        const Icon   = isOT ? ClipboardList : AlertCircle;
        return (
          <div key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isOT ? "bg-blue-50" : "bg-status-warn-bg")}>
                <Icon size={12} className={isOT ? "text-brand-blue" : "text-status-warn"} />
              </div>
              <div className="w-px flex-1 bg-border" />
            </div>
            <div className="mb-3 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-text-tertiary">{e.numero}</span>
                <span className={cn("rounded-full px-1.5 py-px text-[9px] font-semibold", tone)}>{e.estado}</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-text-primary leading-snug line-clamp-2">{e.titulo}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-text-tertiary">
                <span>{format(new Date(e.fecha), "d MMM yyyy", { locale: es })}</span>
                {e.tecnicoNombre && <span>· {e.tecnicoNombre}</span>}
                {e.costo && <span>· ${Number(e.costo).toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────

export function EquipoDrawer({ equipo, onClose, onTransition }: EquipoDrawerProps) {
  const isOpen  = Boolean(equipo);
  const actions = equipo ? getActions(equipo.estado) : [];
  const [tab, setTab] = useState<"info" | "historial">("info");

  // Reset tab when equipo changes
  useEffect(() => { setTab("info"); }, [equipo?.id]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/20 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 z-40 flex h-screen w-[420px] flex-col border-l border-border bg-bg-primary shadow-xl transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {equipo && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="font-mono text-xs text-text-tertiary">{equipo.cu}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
                  {equipo.tipo}
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["info", "historial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors",
                    tab === t
                      ? "border-b-2 border-brand-blue text-brand-blue"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "info" ? "Información" : "Historial"}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              {tab === "historial" ? (
                <HistorialTab equipoId={equipo.id} />
              ) : (
              <>
              {/* Estado indicator */}
              <EstadoIndicator estado={equipo.estado} />

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge tone={ESTADO_TONE[equipo.estado]}>
                  {ESTADO_LABEL[equipo.estado]}
                </Badge>
                <Badge tone={CRITICIDAD_TONE[equipo.criticidad]} dot>
                  {CRITICIDAD_LABEL[equipo.criticidad]}
                </Badge>
              </div>

              {/* Details card */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-4">
                <DetailRow icon={MapPin} label="Sucursal">
                  {equipo.sucursal.nombre}
                </DetailRow>

                <DetailRow icon={Wrench} label="Área">
                  {equipo.area}
                </DetailRow>

                <DetailRow icon={Gauge} label="Marca / Modelo">
                  <span className="font-medium">{equipo.marca}</span>
                  <span className="ml-1.5 text-xs text-text-secondary">{equipo.modelo}</span>
                </DetailRow>

                {equipo.horas > 0 && (
                  <DetailRow icon={Clock} label="Horas de operación">
                    <span className="font-medium">{equipo.horas.toLocaleString("es-MX")}</span>
                    <span className="ml-1 text-xs text-text-secondary">h</span>
                  </DetailRow>
                )}

                <DetailRow icon={Calendar} label="Último mantenimiento">
                  {equipo.ultMant
                    ? format(new Date(equipo.ultMant), "d 'de' MMMM yyyy", { locale: es })
                    : <span className="text-text-tertiary">Sin registro</span>
                  }
                </DetailRow>

                <DetailRow icon={Calendar} label="Próximo mantenimiento">
                  {equipo.proxMant
                    ? format(new Date(equipo.proxMant), "d 'de' MMMM yyyy", { locale: es })
                    : <span className="text-text-tertiary">Sin programar</span>
                  }
                </DetailRow>

                <DetailRow icon={Calendar} label="Alta en sistema">
                  {format(new Date(equipo.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                </DetailRow>
              </div>

              {/* Baja notice */}
              {equipo.estado === "BAJA" && (
                <div className="rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-sm text-text-tertiary">
                  Este equipo está dado de baja y no puede ser gestionado.
                </div>
              )}
              </>
              )}
            </div>

            {/* Actions footer */}
            {actions.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Cambiar estado
                </span>
                {actions.map((action) => (
                  <button
                    key={action.next}
                    onClick={() => onTransition(equipo.id, action.next)}
                    className={cn(
                      "h-9 rounded-lg px-4 text-sm font-medium transition-colors",
                      ACTION_CLASS[action.variant]
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
