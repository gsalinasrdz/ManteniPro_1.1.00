"use client";

import {
  X, Wrench, MapPin, User, Calendar, RefreshCw,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import {
  format, addDays, addMonths,
  differenceInDays, isPast, isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import type { Preventivo, Equipo, Sucursal, Usuario } from "@prisma/client";

// ── Type export ────────────────────────────────────────────────

export type PreventivoConRelaciones = Preventivo & {
  equipo: Pick<Equipo, "tipo" | "cu"> & {
    sucursal: Pick<Sucursal, "id" | "nombre">;
  };
  tecnico: Pick<Usuario, "nombre" | "iniciales"> | null;
};

// ── Next-date calculator ────────────────────────────────────────

export function calcNextProx(frecuencia: string, from: Date): Date {
  switch (frecuencia) {
    case "SEMANAL":    return addDays(from, 7);
    case "QUINCENAL":  return addDays(from, 15);
    case "MENSUAL":    return addMonths(from, 1);
    case "BIMESTRAL":  return addMonths(from, 2);
    case "TRIMESTRAL": return addMonths(from, 3);
    case "SEMESTRAL":  return addMonths(from, 6);
    case "ANUAL":      return addMonths(from, 12);
    default:           return addMonths(from, 1);
  }
}

// ── Visual maps ────────────────────────────────────────────────

const ESTADO_TONE: Record<string, "gray" | "warn" | "danger" | "ok"> = {
  PROGRAMADO: "gray",
  PROXIMO:    "warn",
  VENCIDO:    "danger",
  COMPLETADO: "ok",
};

const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADO: "Programado",
  PROXIMO:    "Próximo",
  VENCIDO:    "Vencido",
  COMPLETADO: "Completado",
};

const FRECUENCIA_LABEL: Record<string, string> = {
  SEMANAL:    "Semanal",
  QUINCENAL:  "Quincenal",
  MENSUAL:    "Mensual",
  BIMESTRAL:  "Bimestral",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL:  "Semestral",
  ANUAL:      "Anual",
};

// ── Urgency indicator ──────────────────────────────────────────

function UrgencyBadge({ prox, estado }: { prox: Date; estado: string }) {
  if (estado === "COMPLETADO") return null;

  const proxDate = new Date(prox);
  const today    = new Date();
  const days     = differenceInDays(proxDate, today);

  if (isPast(proxDate) && !isToday(proxDate)) {
    const overdue = Math.abs(days);
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 py-2">
        <AlertTriangle size={13} className="shrink-0 text-status-danger" />
        <span className="text-xs font-medium text-status-danger">
          Vencido hace {overdue} día{overdue !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  if (isToday(proxDate)) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-warn/30 bg-status-warn-bg px-3 py-2">
        <Clock size={13} className="shrink-0 text-status-warn" />
        <span className="text-xs font-medium text-status-warn">Vence hoy</span>
      </div>
    );
  }

  if (days <= 7) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-status-warn/30 bg-status-warn-bg px-3 py-2">
        <Clock size={13} className="shrink-0 text-status-warn" />
        <span className="text-xs font-medium text-status-warn">
          Vence en {days} día{days !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-2">
      <Clock size={13} className="shrink-0 text-text-tertiary" />
      <span className="text-xs text-text-tertiary">
        Programado en {days} días
      </span>
    </div>
  );
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

// ── Drawer ─────────────────────────────────────────────────────

interface PmDrawerProps {
  pm:           PreventivoConRelaciones | null;
  onClose:      () => void;
  onCompletar:  (pmId: string) => void;
}

export function PmDrawer({ pm, onClose, onCompletar }: PmDrawerProps) {
  const isOpen = Boolean(pm);

  const canComplete = pm
    ? pm.estado !== "COMPLETADO"
    : false;

  const nextDate = pm ? calcNextProx(pm.frecuencia, new Date()) : null;

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
        {pm && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="font-mono text-xs text-text-tertiary">{pm.codigo}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
                  {pm.tarea}
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              {/* Urgency + estado */}
              <div className="flex flex-col gap-2">
                <UrgencyBadge prox={new Date(pm.prox)} estado={pm.estado} />
                <div className="flex flex-wrap gap-2">
                  <Badge tone={ESTADO_TONE[pm.estado]} dot={pm.estado === "VENCIDO"}>
                    {ESTADO_LABEL[pm.estado]}
                  </Badge>
                  <Badge tone="gray">
                    <RefreshCw size={10} className="mr-1" />
                    {FRECUENCIA_LABEL[pm.frecuencia]}
                  </Badge>
                </div>
              </div>

              {/* Details card */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-4">
                <DetailRow icon={Wrench} label="Equipo">
                  <span className="font-medium">{pm.equipo.tipo}</span>
                  <span className="ml-1.5 font-mono text-xs text-text-tertiary">
                    {pm.equipo.cu}
                  </span>
                </DetailRow>

                <DetailRow icon={MapPin} label="Sucursal">
                  {pm.equipo.sucursal.nombre}
                </DetailRow>

                <DetailRow icon={Calendar} label="Próxima ejecución">
                  <span className={cn(
                    "font-medium",
                    isPast(new Date(pm.prox)) && pm.estado !== "COMPLETADO"
                      ? "text-status-danger"
                      : "text-text-primary"
                  )}>
                    {format(new Date(pm.prox), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </DetailRow>

                <DetailRow icon={User} label="Técnico asignado">
                  {pm.tecnico ? (
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-bold text-brand-blue">
                        {pm.tecnico.iniciales}
                      </span>
                      {pm.tecnico.nombre}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Sin asignar</span>
                  )}
                </DetailRow>
              </div>

              {/* Completed notice */}
              {pm.estado === "COMPLETADO" && (
                <div className="flex flex-col gap-2 rounded-xl border border-status-ok/30 bg-status-ok-bg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-status-ok" />
                    <span className="text-sm font-medium text-status-ok">
                      PM completado
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Próxima ejecución reprogramada para{" "}
                    <span className="font-semibold">
                      {nextDate
                        ? format(nextDate, "d 'de' MMMM yyyy", { locale: es })
                        : "—"}
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* Next-date preview (only when can complete) */}
              {canComplete && nextDate && (
                <div className="rounded-lg border border-border bg-bg-secondary px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Si se registra hoy, siguiente fecha
                  </div>
                  <div className="mt-1 text-sm font-medium text-text-primary">
                    {format(nextDate, "d 'de' MMMM yyyy", { locale: es })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
              {canComplete ? (
                <>
                  <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Acciones
                  </span>
                  <button
                    onClick={() => onCompletar(pm.id)}
                    className="h-9 rounded-lg bg-status-ok px-4 text-sm font-medium text-white transition-colors hover:bg-status-ok/90"
                  >
                    Registrar ejecución completada
                  </button>
                </>
              ) : (
                <p className="text-center text-xs text-text-tertiary">
                  Este PM ya fue completado. Se reprogramará en el siguiente ciclo.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
