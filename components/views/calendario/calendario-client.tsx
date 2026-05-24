"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameDay, isSameMonth,
  format, addMonths, subMonths, isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import { LocationBadge } from "@/components/atoms/location-badge";

export type TipoEvento = "ot" | "pm_programado" | "pm_proximo" | "pm_vencido";

export type EventoCalendario = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  referencia: string;
  sucursal?: string;
  fecha: Date;
  hora?: string;
};

interface CalendarioClientProps {
  eventos: EventoCalendario[];
  hoy?: Date;
}

// ── Visual maps ──────────────────────────────────────────────

const TIPO_DOT: Record<TipoEvento, string> = {
  ot:            "bg-brand-blue-mid",
  pm_programado: "bg-text-tertiary",
  pm_proximo:    "bg-status-warn-mid",
  pm_vencido:    "bg-status-danger-mid",
};

const TIPO_PILL: Record<TipoEvento, string> = {
  ot:            "bg-status-info-bg text-status-info",
  pm_programado: "bg-bg-tertiary text-text-tertiary",
  pm_proximo:    "bg-status-warn-bg text-status-warn",
  pm_vencido:    "bg-status-danger-bg text-status-danger",
};

const TIPO_BADGE_TONE: Record<TipoEvento, "info" | "gray" | "warn" | "danger"> = {
  ot:            "info",
  pm_programado: "gray",
  pm_proximo:    "warn",
  pm_vencido:    "danger",
};

const TIPO_LABEL: Record<TipoEvento, string> = {
  ot:            "Orden de trabajo",
  pm_programado: "PM Programado",
  pm_proximo:    "PM Próximo",
  pm_vencido:    "PM Vencido",
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const LEYENDA: { tipo: TipoEvento; label: string }[] = [
  { tipo: "ot",            label: "Orden de trabajo" },
  { tipo: "pm_proximo",    label: "PM próximo" },
  { tipo: "pm_vencido",    label: "PM vencido" },
  { tipo: "pm_programado", label: "PM programado" },
];

// ── Day detail panel ─────────────────────────────────────────

const TIPO_HREF: Record<TipoEvento, string> = {
  ot:            "/ordenes",
  pm_programado: "/preventivos",
  pm_proximo:    "/preventivos",
  pm_vencido:    "/preventivos",
};

function DayPanel({ dia, eventos, onNuevaOT }: { dia: Date | null; eventos: EventoCalendario[]; onNuevaOT: (fecha: Date) => void }) {
  const router = useRouter();

  if (!dia) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <CalendarDays size={28} className="text-text-tertiary" />
        <p className="text-sm text-text-tertiary">Selecciona un día<br/>para ver sus eventos</p>
      </div>
    );
  }

  const del_dia = eventos.filter((e) => isSameDay(e.fecha, dia));

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="text-md font-semibold text-text-primary capitalize">
            {format(dia, "EEEE d", { locale: es })}
          </div>
          <div className="text-xs text-text-tertiary capitalize">
            {format(dia, "MMMM yyyy", { locale: es })}
          </div>
        </div>
        <button
          onClick={() => onNuevaOT(dia)}
          title="Nueva OT en este día"
          className="flex h-7 items-center gap-1 rounded-lg bg-brand-blue px-2.5 text-[11px] font-medium text-white hover:bg-brand-blue/90"
        >
          <Plus size={11} />
          Nueva OT
        </button>
      </div>

      {del_dia.length === 0 ? (
        <p className="text-xs text-text-tertiary">Sin eventos este día.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {del_dia.map((ev) => (
            <button
              key={ev.id}
              onClick={() => router.push(TIPO_HREF[ev.tipo])}
              className="w-full rounded-lg border border-border bg-bg-secondary p-3 text-left transition-colors hover:border-brand-blue/30 hover:bg-brand-blue-light"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge tone={TIPO_BADGE_TONE[ev.tipo]} size="sm">
                  {TIPO_LABEL[ev.tipo]}
                </Badge>
                <div className="flex items-center gap-1">
                  {ev.hora && (
                    <span className="font-mono text-xs text-text-tertiary">{ev.hora}</span>
                  )}
                  <ArrowRight size={11} className="text-text-tertiary" />
                </div>
              </div>
              <p className="mt-1.5 text-xs font-medium leading-snug text-text-primary">
                {ev.titulo}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] text-text-tertiary">{ev.referencia}</span>
                {ev.sucursal && <LocationBadge sucursal={ev.sucursal} />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function CalendarioClient({ eventos, hoy = new Date() }: CalendarioClientProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(hoy));
  const [selectedDay, setSelectedDay]   = useState<Date | null>(hoy);

  // Build calendar grid
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Index events by date key for fast lookup
  const eventosByDay = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>();
    for (const ev of eventos) {
      const key = format(ev.fecha, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventos]);

  const totalMes = useMemo(() => {
    return eventos.filter((e) => isSameMonth(e.fecha, currentMonth)).length;
  }, [eventos, currentMonth]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventosByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, eventosByDay]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header + leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-primary text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="w-36 text-center text-md font-semibold capitalize text-text-primary">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-primary text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <ChevronRight size={14} />
          </button>
          <span className="text-sm text-text-tertiary">
            {totalMes} evento{totalMes !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3">
          {LEYENDA.map(({ tipo, label }) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", TIPO_DOT[tipo])} />
              <span className="text-xs text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar + panel */}
      <div className="flex gap-4">
        {/* Grid */}
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-bg-primary">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const key       = format(day, "yyyy-MM-dd");
              const dayEvents = eventosByDay.get(key) ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay     = isToday(day);
              const isSelected     = selectedDay ? isSameDay(day, selectedDay) : false;
              const isLastRow      = idx >= days.length - 7;
              const visible        = dayEvents.slice(0, 2);
              const extra          = dayEvents.length - visible.length;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={cn(
                    "group relative flex flex-col gap-0.5 p-1.5 text-left transition-colors",
                    !isLastRow && "border-b border-border",
                    (idx % 7) < 6 && "border-r border-border",
                    isSelected
                      ? "bg-brand-blue-light"
                      : "hover:bg-bg-secondary",
                    !isCurrentMonth && "opacity-40"
                  )}
                  style={{ minHeight: "80px" }}
                >
                  {/* Day number */}
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isTodayDay
                      ? "bg-brand-blue text-white"
                      : isSelected
                      ? "text-brand-blue"
                      : "text-text-secondary"
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5">
                    {visible.map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "flex items-center gap-1 truncate rounded px-1 py-px text-[10px] font-medium leading-tight",
                          TIPO_PILL[ev.tipo]
                        )}
                      >
                        <span className={cn("h-1 w-1 shrink-0 rounded-full", TIPO_DOT[ev.tipo])} />
                        <span className="truncate">{ev.referencia}</span>
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="px-1 text-[10px] font-medium text-text-tertiary">
                        +{extra} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-64 shrink-0 overflow-hidden rounded-lg border border-border bg-bg-primary">
          <DayPanel
            dia={selectedDay}
            eventos={selectedEvents}
            onNuevaOT={(fecha) => {
              const iso = format(fecha, "yyyy-MM-dd");
              router.push(`/ordenes?fecha=${iso}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
