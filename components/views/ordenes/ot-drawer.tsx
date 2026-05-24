"use client";

import { useState, useRef, useTransition } from "react";
import { X, Wrench, MapPin, Calendar, User, ArrowRight, CheckCircle2, Camera, ImageIcon, Loader2, MessageSquare, Send } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import { useUploadThing } from "@/lib/uploadthing";
import { agregarBitacora } from "@/lib/actions/ot";
import { toast } from "sonner";
import { CostosSection } from "@/components/views/ordenes/costos-section";
import { FacturasSection } from "@/components/views/ordenes/factura-section";
import type { FacturaEntry } from "@/components/views/ordenes/factura-section";
import type { OrdenTrabajo, Equipo, Sucursal, Usuario } from "@prisma/client";

export type { FacturaEntry };

export type BitacoraEntry = {
  id: string;
  texto: string;
  createdAt: Date;
  autor: Pick<Usuario, "nombre" | "iniciales"> | null;
};

export type OrdenConRelaciones = OrdenTrabajo & {
  equipo: Pick<Equipo, "tipo" | "cu"> & {
    sucursal: Pick<Sucursal, "id" | "nombre">;
  };
  tecnico:  Pick<Usuario, "nombre" | "iniciales"> | null;
  bitacora: BitacoraEntry[];
  facturas: FacturaEntry[];
};

// ── Visual maps ────────────────────────────────────────────────

const TIPO_TONE: Record<string, "info" | "danger" | "purple"> = {
  PREVENTIVO: "info", CORRECTIVO: "danger", PREDICTIVO: "purple",
};
const TIPO_LABEL: Record<string, string> = {
  PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo", PREDICTIVO: "Predictivo",
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

// ── Status timeline ────────────────────────────────────────────

const TIMELINE_STEPS = ["PROGRAMADA", "ASIGNADA", "EN_PROCESO", "CERRADA"] as const;
type EstadoTimeline = typeof TIMELINE_STEPS[number];

function StatusTimeline({ estado }: { estado: string }) {
  if (estado === "CANCELADA") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-bg-tertiary px-2.5 py-0.5 text-xs text-text-tertiary">
          Cancelada
        </span>
      </div>
    );
  }

  const activeIdx = TIMELINE_STEPS.indexOf(estado as EstadoTimeline);

  return (
    <div className="flex items-center gap-0.5">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        return (
          <div key={step} className="flex items-center gap-0.5">
            <div className={cn(
              "flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold transition-colors",
              current
                ? "bg-brand-blue text-white"
                : done
                ? "bg-status-ok-bg text-status-ok"
                : "bg-bg-tertiary text-text-tertiary"
            )}>
              {done && <CheckCircle2 size={10} className="mr-1" />}
              {ESTADO_LABEL[step]}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
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
        <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</div>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  );
}

// ── Action buttons per state ───────────────────────────────────

type TransitionAction = {
  label: string;
  nextEstado: string;
  variant: "primary" | "danger" | "ghost";
};

const TRANSITIONS: Record<string, TransitionAction[]> = {
  PROGRAMADA: [
    { label: "Marcar como asignada", nextEstado: "ASIGNADA",  variant: "primary" },
    { label: "Cancelar OT",          nextEstado: "CANCELADA", variant: "ghost"   },
  ],
  ASIGNADA: [
    { label: "Iniciar trabajo", nextEstado: "EN_PROCESO", variant: "primary" },
    { label: "Cancelar OT",     nextEstado: "CANCELADA",  variant: "ghost"   },
  ],
  EN_PROCESO: [
    { label: "Cerrar OT",       nextEstado: "CERRADA",    variant: "primary" },
  ],
};

export type TecnicoOption = Pick<Usuario, "id" | "nombre" | "iniciales">;

// ── Bitácora section ───────────────────────────────────────────

function BitacoraSection({
  otId,
  entradas,
  onAdded,
}: {
  otId:     string;
  entradas: BitacoraEntry[];
  onAdded:  (entry: BitacoraEntry) => void;
}) {
  const [texto, setTexto]     = useState("");
  const [pending, startTrans] = useTransition();

  function handleSubmit() {
    const t = texto.trim();
    if (!t) return;
    startTrans(async () => {
      const result = await agregarBitacora(otId, t);
      if (!result.ok) {
        toast.error("Error", { description: result.error });
        return;
      }
      onAdded({
        id:        crypto.randomUUID(),
        texto:     t,
        createdAt: new Date(),
        autor:     null,
      });
      setTexto("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
        Bitácora {entradas.length > 0 && `(${entradas.length})`}
      </span>

      {/* Feed */}
      {entradas.length === 0 ? (
        <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-tertiary">
          <MessageSquare size={12} className="mr-1.5 opacity-50" />
          Sin notas registradas
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entradas.map((e) => (
            <div key={e.id} className="rounded-lg border border-border bg-bg-secondary px-3 py-2.5">
              <p className="text-xs leading-relaxed text-text-primary">{e.texto}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {e.autor && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue-light text-[9px] font-bold text-brand-blue">
                    {e.autor.iniciales}
                  </span>
                )}
                <span className="text-[10px] text-text-tertiary">
                  {e.autor?.nombre ?? "Tú"} ·{" "}
                  {formatDistanceToNow(new Date(e.createdAt), { locale: es, addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder="Agregar nota… (⌘↵ para enviar)"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!texto.trim() || pending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Evidencias uploader ────────────────────────────────────────

function EvidenciasSection({
  otId,
  evidencias,
  activa,
  onAdded,
}: {
  otId:       string;
  evidencias: string[];
  activa:     boolean;
  onAdded:    (urls: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("otEvidencias", {
    onClientUploadComplete: (res: { ufsUrl?: string; url: string }[]) => {
      const urls = res.map((f) => f.ufsUrl ?? f.url);
      onAdded(urls);
    },
  });

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    startUpload(Array.from(files));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
          Evidencias {evidencias.length > 0 && `(${evidencias.length})`}
        </span>
        {activa && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex h-6 items-center gap-1 rounded-md border border-brand-blue px-2 text-[10px] font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
            {isUploading ? "Subiendo…" : "Agregar foto"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {evidencias.length === 0 ? (
        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-tertiary">
          <ImageIcon size={12} className="mr-1.5 opacity-50" />
          Sin evidencias registradas
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {evidencias.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightbox(url)}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-bg-tertiary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Evidencia ${i + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Evidencia"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────

interface OtDrawerProps {
  ot:                  OrdenConRelaciones | null;
  tecnicos:            TecnicoOption[];
  onClose:             () => void;
  onTransition:        (otId: string, nextEstado: string) => void;
  onAsignar:           (otId: string, tecnicoId: string | null) => void;
  onEvidenciasAdded:   (otId: string, urls: string[]) => void;
  onBitacoraAdded:     (otId: string, entry: BitacoraEntry) => void;
  onCostosUpdated:     (otId: string, estimado: number | null, real: number | null) => void;
  onFacturaAdded:      (otId: string, factura: FacturaEntry) => void;
  onFacturaUpdated:    (otId: string, facturaId: string, changes: Partial<FacturaEntry>) => void;
}

export function OtDrawer({ ot, tecnicos, onClose, onTransition, onAsignar, onEvidenciasAdded, onBitacoraAdded, onCostosUpdated, onFacturaAdded, onFacturaUpdated }: OtDrawerProps) {
  const isOpen = Boolean(ot);
  const [tecnicoSel, setTecnicoSel] = useState<string>("");

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
        {ot && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="font-mono text-xs text-text-tertiary">{ot.numero}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
                  {ot.titulo}
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
              {/* Status timeline */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Estado actual
                </span>
                <StatusTimeline estado={ot.estado} />
              </div>

              {/* Badges: tipo + prioridad */}
              <div className="flex flex-wrap gap-2">
                <Badge tone={TIPO_TONE[ot.tipo]}>{TIPO_LABEL[ot.tipo]}</Badge>
                <Badge tone={PRIORIDAD_TONE[ot.prioridad]} dot>
                  Prioridad {ot.prioridad.charAt(0) + ot.prioridad.slice(1).toLowerCase()}
                </Badge>
                <Badge tone={ESTADO_TONE[ot.estado]}>{ESTADO_LABEL[ot.estado]}</Badge>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-4">
                <DetailRow icon={Wrench} label="Equipo">
                  <span className="font-medium">{ot.equipo.tipo}</span>
                  <span className="ml-1.5 font-mono text-xs text-text-tertiary">{ot.equipo.cu}</span>
                </DetailRow>

                <DetailRow icon={MapPin} label="Sucursal">
                  {ot.equipo.sucursal.nombre}
                </DetailRow>

                <DetailRow icon={Calendar} label="Programada">
                  {format(new Date(ot.programada), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
                </DetailRow>

                {ot.iniciada && (
                  <DetailRow icon={Calendar} label="Iniciada">
                    {format(new Date(ot.iniciada), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
                  </DetailRow>
                )}

                {ot.cerrada && (
                  <DetailRow icon={Calendar} label="Cerrada">
                    {format(new Date(ot.cerrada), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
                  </DetailRow>
                )}

                <DetailRow icon={User} label="Técnico asignado">
                  {ot.tecnico ? (
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-bold text-brand-blue">
                        {ot.tecnico.iniciales}
                      </span>
                      {ot.tecnico.nombre}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Sin asignar</span>
                  )}
                </DetailRow>

                {/* Asignar / cambiar técnico (solo en estados activos) */}
                {ot.estado !== "CERRADA" && ot.estado !== "CANCELADA" && tecnicos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={tecnicoSel}
                      onChange={(e) => setTecnicoSel(e.target.value)}
                      className="h-8 flex-1 rounded-lg border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { onAsignar(ot.id, tecnicoSel || null); setTecnicoSel(""); }}
                      className="h-8 rounded-lg border border-brand-blue px-3 text-xs font-medium text-brand-blue hover:bg-brand-blue-light"
                    >
                      Asignar
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              {ot.descripcion && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Descripción
                  </span>
                  <p className="text-sm leading-relaxed text-text-secondary">{ot.descripcion}</p>
                </div>
              )}

              {/* Evidencias */}
              <EvidenciasSection
                otId={ot.id}
                evidencias={ot.evidencias}
                activa={ot.estado !== "CERRADA" && ot.estado !== "CANCELADA"}
                onAdded={(urls) => onEvidenciasAdded(ot.id, urls)}
              />

              {/* Costos */}
              <CostosSection
                otId={ot.id}
                costoEstimado={ot.costoEstimado ? Number(ot.costoEstimado) : null}
                costoReal={ot.costo ? Number(ot.costo) : null}
                onUpdated={(e, r) => onCostosUpdated(ot.id, e, r)}
              />

              {/* Facturas */}
              <FacturasSection
                otId={ot.id}
                tecnicoId={ot.tecnicoId}
                facturas={ot.facturas}
                onAdded={(f) => onFacturaAdded(ot.id, f)}
                onUpdated={(fid, changes) => onFacturaUpdated(ot.id, fid, changes)}
              />

              {/* Bitácora */}
              <BitacoraSection
                otId={ot.id}
                entradas={ot.bitacora}
                onAdded={(entry) => onBitacoraAdded(ot.id, entry)}
              />
            </div>

            {/* Actions footer */}
            {TRANSITIONS[ot.estado] != null && (
              <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Acciones
                </span>
                {(TRANSITIONS[ot.estado] ?? []).map((action) => (
                  <button
                    key={action.nextEstado}
                    onClick={() => onTransition(ot.id, action.nextEstado)}
                    className={cn(
                      "h-9 rounded-lg px-4 text-sm font-medium transition-colors",
                      action.variant === "primary"
                        ? "bg-brand-blue text-white hover:bg-brand-blue/90"
                        : action.variant === "danger"
                        ? "bg-status-danger-bg text-status-danger hover:bg-status-danger-mid/10"
                        : "border border-border text-text-secondary hover:bg-bg-secondary"
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
