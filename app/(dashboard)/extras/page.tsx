import {
  Smartphone, QrCode, MessageCircle, BrainCircuit,
  DollarSign, Truck, FileSpreadsheet, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type Categoria = "Movilidad" | "Automatización" | "Analítica" | "Integración" | "Reportes" | "Plataforma";
type Estado    = "disponible" | "en_desarrollo" | "proxima_version";

type PropuestaExtra = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  estado: Estado;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  destacado?: boolean;
};

// ── Data ───────────────────────────────────────────────────────

const EXTRAS: PropuestaExtra[] = [
  {
    id: "ex1",
    titulo: "App móvil para técnicos",
    descripcion:
      "Aplicación iOS y Android para que los técnicos consulten, inicien y cierren órdenes de trabajo directamente desde el campo, con carga de evidencias y firma digital.",
    categoria: "Movilidad",
    estado: "proxima_version",
    icon: Smartphone,
    iconColor: "text-brand-blue",
    iconBg: "bg-status-info-bg",
    destacado: true,
  },
  {
    id: "ex2",
    titulo: "Portal de reporte por QR",
    descripcion:
      "Código QR por equipo para que operadores y cocineros reporten incidencias directamente desde cocina sin necesidad de una cuenta. Foto + descripción en 30 segundos.",
    categoria: "Movilidad",
    estado: "proxima_version",
    icon: QrCode,
    iconColor: "text-status-warn",
    iconBg: "bg-status-warn-bg",
  },
  {
    id: "ex3",
    titulo: "Alertas por WhatsApp",
    descripcion:
      "Notificaciones automáticas vía WhatsApp Business API cuando se genera una OT crítica, un PM vence o un equipo cambia a estado FALLA. Sin necesidad de revisar la plataforma.",
    categoria: "Automatización",
    estado: "en_desarrollo",
    icon: MessageCircle,
    iconColor: "text-status-ok",
    iconBg: "bg-status-ok-bg",
    destacado: true,
  },
  {
    id: "ex4",
    titulo: "Análisis predictivo (IA)",
    descripcion:
      "Motor de IA que analiza el historial de fallas, frecuencia de mantenimientos y condiciones de operación para predecir cuándo fallará cada equipo antes de que ocurra.",
    categoria: "Analítica",
    estado: "proxima_version",
    icon: BrainCircuit,
    iconColor: "text-[#7C3AED]",
    iconBg: "bg-[#EDE7F6]",
  },
  {
    id: "ex5",
    titulo: "Módulo de presupuestos",
    descripcion:
      "Control de costos de mantenimiento por equipo, sucursal y período. Comparativo presupuesto vs. gasto real, con exportación a Excel para contabilidad.",
    categoria: "Analítica",
    estado: "proxima_version",
    icon: DollarSign,
    iconColor: "text-status-ok",
    iconBg: "bg-status-ok-bg",
  },
  {
    id: "ex6",
    titulo: "Integración con proveedores",
    descripcion:
      "Solicitud de refacciones directamente desde la OT. Cotización automática con proveedores homologados, comparador de precios y seguimiento de pedidos.",
    categoria: "Integración",
    estado: "proxima_version",
    icon: Truck,
    iconColor: "text-status-warn",
    iconBg: "bg-status-warn-bg",
  },
  {
    id: "ex7",
    titulo: "Reportes personalizados",
    descripcion:
      "Generador de reportes en PDF y Excel: OTs por período, cumplimiento de PMs, costo por equipo, tiempo de respuesta por técnico. Envío automático por correo.",
    categoria: "Reportes",
    estado: "en_desarrollo",
    icon: FileSpreadsheet,
    iconColor: "text-status-info",
    iconBg: "bg-status-info-bg",
  },
  {
    id: "ex8",
    titulo: "Multi-empresa",
    descripcion:
      "Gestión de múltiples cadenas de restaurantes en una sola plataforma. Ideal para grupos corporativos o despachos de mantenimiento que atienden a varios clientes.",
    categoria: "Plataforma",
    estado: "proxima_version",
    icon: Building2,
    iconColor: "text-text-secondary",
    iconBg: "bg-bg-tertiary",
  },
];

// ── Visual maps ────────────────────────────────────────────────

const ESTADO_META: Record<Estado, { label: string; pill: string }> = {
  disponible:      { label: "Disponible",       pill: "bg-status-ok-bg text-status-ok" },
  en_desarrollo:   { label: "En desarrollo",    pill: "bg-status-info-bg text-status-info" },
  proxima_version: { label: "Próxima versión",  pill: "bg-bg-tertiary text-text-tertiary" },
};

const CATEGORIA_PILL: Record<Categoria, string> = {
  Movilidad:      "bg-status-info-bg text-status-info",
  Automatización: "bg-status-ok-bg text-status-ok",
  Analítica:      "bg-[#EDE7F6] text-[#5B3A91]",
  Integración:    "bg-status-warn-bg text-status-warn",
  Reportes:       "bg-status-info-bg text-status-info",
  Plataforma:     "bg-bg-tertiary text-text-tertiary",
};

// ── Extra card ─────────────────────────────────────────────────

function ExtraCard({ extra }: { extra: PropuestaExtra }) {
  const estadoMeta = ESTADO_META[extra.estado];
  const Icon = extra.icon;

  return (
    <div className={cn(
      "relative flex flex-col gap-3 rounded-xl border bg-bg-primary p-5 transition-shadow hover:shadow-sm",
      extra.destacado ? "border-brand-blue/30" : "border-border"
    )}>
      {extra.destacado && (
        <span className="absolute right-4 top-4 rounded-full bg-brand-blue-light px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
          Recomendado
        </span>
      )}

      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", extra.iconBg)}>
          <Icon size={18} className={extra.iconColor} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">{extra.titulo}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CATEGORIA_PILL[extra.categoria])}>
              {extra.categoria}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", estadoMeta.pill)}>
              {estadoMeta.label}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-text-secondary">{extra.descripcion}</p>

      {/* CTA */}
      <div className="mt-auto pt-1">
        <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-light hover:text-brand-blue">
          Solicitar información
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function ExtrasPage() {
  const porEstado = (e: Estado) => EXTRAS.filter((x) => x.estado === e).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Funcionalidades adicionales</h1>
          <p className="text-sm text-text-tertiary">
            Módulos opcionales que pueden activarse en versiones futuras de ManteniPro.
          </p>
        </div>
        {/* Estado summary */}
        <div className="flex items-center gap-2">
          {(["disponible", "en_desarrollo", "proxima_version"] as Estado[]).map((e) => {
            const meta = ESTADO_META[e];
            const count = porEstado(e);
            if (count === 0) return null;
            return (
              <span key={e} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.pill)}>
                {count} {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Intro banner */}
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-light px-5 py-4">
        <p className="text-sm text-text-secondary">
          Estas funcionalidades no están incluidas en el plan base actual. Para conocer costos,
          tiempos de implementación o para priorizar algún módulo en el roadmap, contacta al
          equipo de ManteniPro.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXTRAS.map((extra) => (
          <ExtraCard key={extra.id} extra={extra} />
        ))}
      </div>
    </div>
  );
}
