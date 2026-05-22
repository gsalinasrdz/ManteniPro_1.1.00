import { CheckCircle2, Circle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type FaseEstado = "completado" | "en_curso" | "proximo" | "planificado";

type Feature = {
  texto: string;
  listo: boolean;
};

type Fase = {
  numero: number;
  nombre: string;
  descripcion: string;
  estado: FaseEstado;
  progreso: number;
  features: Feature[];
};

// ── Data ───────────────────────────────────────────────────────

const FASES: Fase[] = [
  {
    numero: 1,
    nombre: "Módulo base",
    descripcion: "Vistas operativas, auth multi-rol y acceso a datos en tiempo real.",
    estado: "completado",
    progreso: 100,
    features: [
      { texto: "Auth y login multi-rol (Gerente, Técnico, Cocinero)", listo: true },
      { texto: "Dashboard con KPIs reales desde base de datos",        listo: true },
      { texto: "Incidencias — reporte, seguimiento y cierre",          listo: true },
      { texto: "Órdenes de trabajo — tabla con filtros multi-sucursal",listo: true },
      { texto: "Preventivos — control de vencimientos y próximos",     listo: true },
      { texto: "Catálogo de equipos con estado y criticidad",          listo: true },
      { texto: "Inventario de refacciones con semáforo de stock",      listo: true },
      { texto: "Calendario mensual de mantenimientos",                 listo: true },
      { texto: "Historial de actividad en timeline",                   listo: true },
      { texto: "Alertas activas priorizadas por severidad",            listo: true },
    ],
  },
  {
    numero: 2,
    nombre: "Operación real",
    descripcion: "Mutaciones completas, flujos de trabajo y carga de evidencias.",
    estado: "en_curso",
    progreso: 25,
    features: [
      { texto: "Conexión DB real en todas las vistas operativas",      listo: false },
      { texto: "Modal «Nueva OT» con Server Action",                   listo: true  },
      { texto: "Modal «Reportar incidencia»",                          listo: false },
      { texto: "Cambio de estado en OTs (workflow completo)",          listo: false },
      { texto: "Generación automática de OT desde incidencia",        listo: false },
      { texto: "Carga de evidencias fotográficas (UploadThing)",      listo: false },
      { texto: "Bitácora de comentarios en OT",                       listo: false },
      { texto: "Asignación y reasignación de técnico",                listo: false },
    ],
  },
  {
    numero: 3,
    nombre: "Inteligencia operativa",
    descripcion: "Reportes, alertas automáticas y visibilidad de costos.",
    estado: "proximo",
    progreso: 0,
    features: [
      { texto: "Reportes exportables (PDF / Excel)",                  listo: false },
      { texto: "Alertas automáticas por correo electrónico",          listo: false },
      { texto: "Dashboard de costos de mantenimiento por equipo",     listo: false },
      { texto: "Historial de costo acumulado por sucursal",           listo: false },
      { texto: "App móvil para técnicos (PWA)",                       listo: false },
      { texto: "Indicador MTTR / MTBF por categoría de equipo",       listo: false },
    ],
  },
  {
    numero: 4,
    nombre: "Escalabilidad",
    descripcion: "Plataforma multi-empresa, IA predictiva e integraciones.",
    estado: "planificado",
    progreso: 0,
    features: [
      { texto: "Multi-empresa — soporte para múltiples cadenas",      listo: false },
      { texto: "Análisis predictivo de fallas con IA",                listo: false },
      { texto: "Integración con sistemas de compras / ERP",           listo: false },
      { texto: "Módulo de proveedores y cotizaciones",                listo: false },
      { texto: "API pública para integraciones externas",             listo: false },
    ],
  },
];

// ── Visual maps ────────────────────────────────────────────────

const ESTADO_META: Record<FaseEstado, {
  label: string;
  pill: string;
  bar: string;
  border: string;
  dot: string;
}> = {
  completado:  {
    label: "Completado",
    pill: "bg-status-ok-bg text-status-ok",
    bar: "bg-status-ok-mid",
    border: "border-status-ok/30",
    dot: "bg-status-ok-mid",
  },
  en_curso: {
    label: "En curso",
    pill: "bg-status-info-bg text-status-info",
    bar: "bg-brand-blue",
    border: "border-brand-blue/30",
    dot: "bg-brand-blue",
  },
  proximo: {
    label: "Próximo",
    pill: "bg-status-warn-bg text-status-warn",
    bar: "bg-status-warn-mid",
    border: "border-border",
    dot: "bg-status-warn-mid",
  },
  planificado: {
    label: "Planificado",
    pill: "bg-bg-tertiary text-text-tertiary",
    bar: "bg-text-tertiary",
    border: "border-border",
    dot: "bg-text-tertiary",
  },
};

// ── Phase card ─────────────────────────────────────────────────

function FaseCard({ fase }: { fase: Fase }) {
  const meta = ESTADO_META[fase.estado];
  const listos = fase.features.filter((f) => f.listo).length;

  return (
    <div className={cn(
      "rounded-xl border bg-bg-primary p-5",
      meta.border
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            meta.dot
          )}>
            {fase.numero}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{fase.nombre}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", meta.pill)}>
                {meta.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-tertiary">{fase.descripcion}</p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-xs text-text-tertiary">
          {listos}/{fase.features.length}
        </span>
      </div>

      {/* Progress bar */}
      {fase.estado !== "planificado" && (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className={cn("h-full rounded-full transition-all", meta.bar)}
              style={{ width: `${fase.progreso}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[10px] text-text-tertiary">
            {fase.progreso}%
          </span>
        </div>
      )}

      {/* Features */}
      <ul className="mt-4 flex flex-col gap-2">
        {fase.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            {f.listo ? (
              <CheckCircle2 size={14} className="mt-px shrink-0 text-status-ok-mid" />
            ) : fase.estado === "en_curso" ? (
              <Clock size={14} className="mt-px shrink-0 text-text-tertiary" />
            ) : (
              <Circle size={14} className="mt-px shrink-0 text-text-tertiary opacity-40" />
            )}
            <span className={cn(
              "text-xs leading-snug",
              f.listo ? "text-text-secondary" : "text-text-tertiary"
            )}>
              {f.texto}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function PlanPage() {
  const totalFeatures = FASES.flatMap((f) => f.features).length;
  const totalListos   = FASES.flatMap((f) => f.features).filter((f) => f.listo).length;
  const pct = Math.round((totalListos / totalFeatures) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Roadmap de implementación</h1>
          <p className="text-sm text-text-tertiary">
            Sabor Express · Avance general del proyecto ManteniPro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-primary px-3 py-1.5">
            <Zap size={13} className="text-brand-blue" />
            <span className="text-xs font-semibold text-text-primary">{pct}% completado</span>
          </div>
          <span className="text-xs text-text-tertiary">Actualizado: mayo 2026</span>
        </div>
      </div>

      {/* Overall progress */}
      <div className="overflow-hidden rounded-xl border border-border bg-bg-primary p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Progreso total</span>
              <span className="font-mono text-sm font-semibold text-text-primary">
                {totalListos} / {totalFeatures} funcionalidades
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
              <div
                className="h-full rounded-full bg-brand-blue transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        {/* Phase mini-indicators */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {FASES.map((fase) => {
            const meta = ESTADO_META[fase.estado];
            return (
              <div key={fase.numero} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-text-tertiary">
                    Fase {fase.numero}
                  </span>
                  <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", meta.pill)}>
                    {meta.label}
                  </span>
                </div>
                <span className="truncate text-xs font-medium text-text-secondary">
                  {fase.nombre}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {FASES.map((fase) => (
          <FaseCard key={fase.numero} fase={fase} />
        ))}
      </div>
    </div>
  );
}
