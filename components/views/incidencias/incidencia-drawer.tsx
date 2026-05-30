"use client";

import { useState, useEffect } from "react";
import {
  X, Wrench, MapPin, User, Clock, AlertTriangle,
  ArrowRight, CheckCircle2, Link2, DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import type { Incidencia, Equipo, Sucursal, Usuario } from "@prisma/client";

// ── Type export ────────────────────────────────────────────────

export type IncidenciaConRelaciones = Incidencia & {
  equipo: Pick<Equipo, "tipo" | "cu"> & {
    sucursal: Pick<Sucursal, "id" | "nombre">;
  };
  reporta: Pick<Usuario, "nombre" | "iniciales">;
};

// ── Visual maps ────────────────────────────────────────────────

const SEV_TONE: Record<string, "danger" | "warn" | "ok"> = {
  ALTA: "danger", MEDIA: "warn", BAJA: "ok",
};

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

// ── Status timeline ────────────────────────────────────────────

const MAIN_STEPS = ["EVALUACION", "EN_ATENCION", "CERRADA"] as const;

function StatusTimeline({ estado }: { estado: string }) {
  if (estado === "DESCARTADA") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-bg-tertiary px-2.5 py-0.5 text-xs font-semibold text-text-tertiary">
          Descartada
        </span>
        <span className="text-xs text-text-tertiary">— incidencia cerrada sin OT</span>
      </div>
    );
  }

  const activeIdx = MAIN_STEPS.indexOf(estado as typeof MAIN_STEPS[number]);

  return (
    <div className="flex items-center gap-0.5">
      {MAIN_STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        return (
          <div key={step} className="flex items-center gap-0.5">
            <div className={cn(
              "flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold transition-colors",
              current
                ? step === "CERRADA"
                  ? "bg-status-ok text-white"
                  : "bg-status-warn text-white"
                : done
                ? "bg-status-ok-bg text-status-ok"
                : "bg-bg-tertiary text-text-tertiary"
            )}>
              {done && <CheckCircle2 size={10} className="mr-1" />}
              {ESTADO_LABEL[step]}
            </div>
            {i < MAIN_STEPS.length - 1 && (
              <ArrowRight size={10} className={cn(
                "shrink-0",
                i < activeIdx ? "text-status-ok" : "text-text-tertiary opacity-40"
              )} />
            )}
          </div>
        );
      })}
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

// ── Transition actions ─────────────────────────────────────────

type ActionDef = {
  label:      string;
  nextEstado: string;
  variant:    "primary" | "ok" | "warn" | "ghost";
  confirm?:   string;
};

function getActions(inc: IncidenciaConRelaciones): ActionDef[] {
  const hasOT = Boolean(inc.ordenId);
  switch (inc.estado) {
    case "EVALUACION":
      return [
        { label: "Tomar en atención", nextEstado: "EN_ATENCION", variant: "primary" },
        { label: "Descartar",         nextEstado: "DESCARTADA",  variant: "ghost",
          confirm: "¿Confirmas descartar esta incidencia?" },
      ];
    case "EN_ATENCION":
      return [
        ...(!hasOT ? [{ label: "Generar OT", nextEstado: "GENERAR_OT", variant: "primary" as const }] : []),
        { label: "Cerrar incidencia", nextEstado: "CERRADA",     variant: "ok" },
        { label: "Descartar",         nextEstado: "DESCARTADA",  variant: "ghost",
          confirm: "¿Confirmas descartar esta incidencia?" },
      ];
    default:
      return [];
  }
}

const ACTION_CLASS: Record<string, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-blue/90",
  ok:      "bg-status-ok text-white hover:bg-status-ok/90",
  warn:    "bg-status-warn text-white hover:bg-status-warn/90",
  ghost:   "border border-border text-text-secondary hover:bg-bg-secondary",
};

// ── Drawer ─────────────────────────────────────────────────────

interface IncidenciaDrawerProps {
  inc:          IncidenciaConRelaciones | null;
  onClose:      () => void;
  onTransition: (incId: string, nextEstado: string, opts?: { costoEstimado?: number }) => void;
}

export function IncidenciaDrawer({ inc, onClose, onTransition }: IncidenciaDrawerProps) {
  const isOpen = Boolean(inc);
  const [showGenOTForm, setShowGenOTForm]       = useState(false);
  const [presupuestoInput, setPresupuestoInput] = useState("");

  useEffect(() => {
    setShowGenOTForm(false);
    setPresupuestoInput("");
  }, [inc?.id]);

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
        {inc && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className={cn(
                    inc.severidad === "ALTA" ? "text-status-danger" :
                    inc.severidad === "MEDIA" ? "text-status-warn" : "text-status-ok"
                  )} />
                  <span className="font-mono text-xs text-text-tertiary">{inc.numero}</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
                  {inc.titulo}
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

              {/* Timeline */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Estado actual
                </span>
                <StatusTimeline estado={inc.estado} />
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge tone={SEV_TONE[inc.severidad]} dot>
                  Severidad {inc.severidad.charAt(0) + inc.severidad.slice(1).toLowerCase()}
                </Badge>
                <Badge tone={ESTADO_TONE[inc.estado]}>
                  {ESTADO_LABEL[inc.estado]}
                </Badge>
              </div>

              {/* Details card */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-4">
                <DetailRow icon={Wrench} label="Equipo">
                  <span className="font-medium">{inc.equipo.tipo}</span>
                  <span className="ml-1.5 font-mono text-xs text-text-tertiary">
                    {inc.equipo.cu}
                  </span>
                </DetailRow>

                <DetailRow icon={MapPin} label="Sucursal">
                  {inc.equipo.sucursal.nombre}
                </DetailRow>

                <DetailRow icon={User} label="Reportó">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-bold text-brand-blue">
                      {inc.reporta.iniciales}
                    </span>
                    {inc.reporta.nombre}
                  </span>
                </DetailRow>

                <DetailRow icon={Clock} label="Reportada hace">
                  {formatDistanceToNow(new Date(inc.createdAt), { locale: es })}
                </DetailRow>

                {inc.ordenId && (
                  <DetailRow icon={Link2} label="OT vinculada">
                    <span className="font-mono text-xs text-brand-blue">
                      OT generada
                    </span>
                  </DetailRow>
                )}
              </div>

              {/* Description */}
              {inc.descripcion && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Descripción
                  </span>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {inc.descripcion}
                  </p>
                </div>
              )}

              {/* Closed / Discarded notice */}
              {(inc.estado === "CERRADA" || inc.estado === "DESCARTADA") && (
                <div className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  inc.estado === "CERRADA"
                    ? "border-status-ok/30 bg-status-ok-bg text-status-ok"
                    : "border-border bg-bg-tertiary text-text-tertiary"
                )}>
                  {inc.estado === "CERRADA"
                    ? "Esta incidencia fue cerrada correctamente."
                    : "Esta incidencia fue descartada — no se generó OT."
                  }
                </div>
              )}
            </div>

            {/* Actions footer */}
            {getActions(inc).length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Acciones
                </span>
                {getActions(inc).map((action) =>
                  action.nextEstado === "GENERAR_OT" ? (
                    showGenOTForm ? (
                      <div key="genot-form" className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-tertiary">
                            Presupuesto estimado{" "}
                            <span className="font-normal">(opcional)</span>
                          </label>
                          <div className="relative">
                            <DollarSign size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={presupuestoInput}
                              onChange={(e) => setPresupuestoInput(e.target.value)}
                              placeholder="0.00"
                              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-6 pr-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowGenOTForm(false); setPresupuestoInput(""); }}
                            className="h-9 flex-1 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-bg-secondary"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              onTransition(inc.id, "GENERAR_OT", {
                                costoEstimado: presupuestoInput ? parseFloat(presupuestoInput) : undefined
                              });
                              setShowGenOTForm(false);
                              setPresupuestoInput("");
                            }}
                            className="h-9 flex-1 rounded-lg bg-brand-blue text-xs font-medium text-white hover:bg-brand-blue/90"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        key="genot"
                        onClick={() => setShowGenOTForm(true)}
                        className={cn("h-9 rounded-lg px-4 text-sm font-medium transition-colors", ACTION_CLASS[action.variant])}
                      >
                        {action.label}
                      </button>
                    )
                  ) : (
                    <button
                      key={action.nextEstado}
                      onClick={() => onTransition(inc.id, action.nextEstado)}
                      className={cn("h-9 rounded-lg px-4 text-sm font-medium transition-colors", ACTION_CLASS[action.variant])}
                    >
                      {action.label}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
