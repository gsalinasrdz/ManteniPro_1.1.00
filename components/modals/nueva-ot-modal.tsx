"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { crearOrdenTrabajo } from "@/lib/actions/ot";
import { shortenSucursal } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type TipoOT    = "CORRECTIVO" | "PREVENTIVO" | "PREDICTIVO";
type Prioridad = "ALTA" | "MEDIA" | "BAJA";

type SucursalOption = { id: string; nombre: string };
type EquipoOption   = { id: string; cu: string; tipo: string; area: string };
type TecnicoOption  = { id: string; nombre: string; iniciales: string };

interface NuevaOTModalProps {
  open:    boolean;
  onClose: () => void;
  sucursales:         SucursalOption[];
  equiposPorSucursal: Record<string, EquipoOption[]>;
  tecnicos:           TecnicoOption[];
}

interface FormState {
  sucursalId:  string;
  equipoId:    string;
  tipo:        TipoOT;
  prioridad:   Prioridad;
  titulo:      string;
  descripcion: string;
  tecnicoId:   string;
  fecha:       string;
}

const EMPTY_FORM: FormState = {
  sucursalId:  "",
  equipoId:    "",
  tipo:        "CORRECTIVO",
  prioridad:   "MEDIA",
  titulo:      "",
  descripcion: "",
  tecnicoId:   "",
  fecha:       "",
};

// ── Visual helpers ─────────────────────────────────────────────

const TIPO_LABELS: Record<TipoOT, string> = {
  CORRECTIVO: "Correctivo",
  PREVENTIVO: "Preventivo",
  PREDICTIVO: "Predictivo",
};

const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};

const PRIORIDAD_COLORS: Record<Prioridad, string> = {
  ALTA:  "border-status-danger text-status-danger bg-status-danger-bg",
  MEDIA: "border-status-warn  text-status-warn  bg-status-warn-bg",
  BAJA:  "border-status-ok    text-status-ok    bg-status-ok-bg",
};

// ── Step 1: Sucursal picker ────────────────────────────────────

function SucursalStep({
  sucursales,
  selected,
  onSelect,
}: {
  sucursales: SucursalOption[];
  selected:   string;
  onSelect:   (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Selecciona la sucursal donde se realizará el trabajo.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {sucursales.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              selected === s.id
                ? "border-brand-blue bg-brand-blue-light text-brand-blue font-medium"
                : "border-border bg-bg-secondary text-text-secondary hover:border-brand-blue/40 hover:bg-bg-tertiary"
            )}
          >
            <MapPin size={13} className="shrink-0 opacity-60" />
            <span className="truncate">{shortenSucursal(s.nombre)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Segmented toggle ────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  colorMap,
}: {
  options:   { value: T; label: string }[];
  value:     T;
  onChange:  (v: T) => void;
  colorMap?: Record<T, string>;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        const color  = colorMap?.[o.value];
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              active
                ? color ?? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Step 2: Detalles ───────────────────────────────────────────

function DetallesStep({
  form,
  onChange,
  sucursales,
  equiposPorSucursal,
  tecnicos,
}: {
  form:               FormState;
  onChange:           (patch: Partial<FormState>) => void;
  sucursales:         SucursalOption[];
  equiposPorSucursal: Record<string, EquipoOption[]>;
  tecnicos:           TecnicoOption[];
}) {
  const sucursal = sucursales.find((s) => s.id === form.sucursalId);
  const equipos  = equiposPorSucursal[form.sucursalId] ?? [];

  const handleEquipoChange = (equipoId: string) => {
    const equipo    = equipos.find((e) => e.id === equipoId);
    const autoTitulo = equipo
      ? `${TIPO_LABELS[form.tipo]} — ${equipo.tipo} ${equipo.cu}`
      : "";
    onChange({ equipoId, titulo: autoTitulo });
  };

  const handleTipoChange = (tipo: TipoOT) => {
    const equipo    = equipos.find((e) => e.id === form.equipoId);
    const autoTitulo = equipo
      ? `${TIPO_LABELS[tipo]} — ${equipo.tipo} ${equipo.cu}`
      : form.titulo;
    onChange({ tipo, titulo: autoTitulo });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Sucursal badge */}
      {sucursal && (
        <div className="flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue-light px-2.5 py-1.5">
          <MapPin size={12} className="text-brand-blue" />
          <span className="text-xs font-medium text-brand-blue">{sucursal.nombre}</span>
        </div>
      )}

      {/* Equipo */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          Equipo <span className="text-status-danger">*</span>
        </Label>
        <select
          value={form.equipoId}
          onChange={(e) => handleEquipoChange(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="" disabled>Selecciona un equipo…</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.cu} — {eq.tipo} ({eq.area})
            </option>
          ))}
        </select>
      </div>

      {/* Tipo + Prioridad en fila */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-text-secondary">Tipo</Label>
          <ToggleGroup<TipoOT>
            options={[
              { value: "CORRECTIVO", label: "Correctivo" },
              { value: "PREVENTIVO", label: "Preventivo" },
              { value: "PREDICTIVO", label: "Predictivo" },
            ]}
            value={form.tipo}
            onChange={handleTipoChange}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-text-secondary">Prioridad</Label>
          <ToggleGroup<Prioridad>
            options={[
              { value: "ALTA",  label: "Alta"  },
              { value: "MEDIA", label: "Media" },
              { value: "BAJA",  label: "Baja"  },
            ]}
            value={form.prioridad}
            onChange={(v) => onChange({ prioridad: v })}
            colorMap={PRIORIDAD_COLORS}
          />
        </div>
      </div>

      {/* Título */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          Título <span className="text-status-danger">*</span>
        </Label>
        <Input
          value={form.titulo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ titulo: e.target.value })
          }
          placeholder="Describe brevemente el trabajo a realizar"
          className="h-8 text-sm"
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          Descripción{" "}
          <span className="font-normal text-text-tertiary">(opcional)</span>
        </Label>
        <textarea
          value={form.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          placeholder="Detalles adicionales, síntomas, materiales requeridos…"
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-text-primary placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Técnico + Fecha en fila */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-text-secondary">
            Técnico{" "}
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </Label>
          <select
            value={form.tecnicoId}
            onChange={(e) => onChange({ tecnicoId: e.target.value })}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.iniciales} — {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-text-secondary">
            Fecha programada <span className="text-status-danger">*</span>
          </Label>
          <input
            type="date"
            value={form.fecha}
            min={today}
            onChange={(e) => onChange({ fecha: e.target.value })}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────

export function NuevaOTModal({
  open,
  onClose,
  sucursales,
  equiposPorSucursal,
  tecnicos,
}: NuevaOTModalProps) {
  const router = useRouter();
  const [step, setStep]       = useState<1 | 2>(1);
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const patch = (p: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...p }));

  const canContinue = Boolean(form.sucursalId);
  const canSubmit   =
    Boolean(form.equipoId) && Boolean(form.titulo.trim()) && Boolean(form.fecha);

  function handleClose() {
    onClose();
    setTimeout(() => { setStep(1); setForm(EMPTY_FORM); }, 200);
  }

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);

    const result = await crearOrdenTrabajo({
      equipoId:    form.equipoId,
      tipo:        form.tipo,
      prioridad:   form.prioridad,
      titulo:      form.titulo,
      descripcion: form.descripcion,
      tecnicoId:   form.tecnicoId,
      fecha:       form.fecha,
    });

    setLoading(false);

    if (!result.ok) {
      toast.error("Error al crear la OT", { description: result.error });
      return;
    }

    const equipo   = (equiposPorSucursal[form.sucursalId] ?? []).find(
      (e) => e.id === form.equipoId
    );
    const tecnico  = tecnicos.find((t) => t.id === form.tecnicoId);
    const sucursal = sucursales.find((s) => s.id === form.sucursalId);

    toast.success("Orden de trabajo creada", {
      description: `${equipo?.cu} · ${shortenSucursal(sucursal?.nombre ?? "")}${
        tecnico ? ` · Asignada a ${tecnico.nombre}` : ""
      }`,
    });

    handleClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg bg-bg-primary" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-text-primary">
              Nueva Orden de Trabajo
            </DialogTitle>
            <span className="text-xs text-text-tertiary">
              Paso {step} de 2 · {step === 1 ? "Sucursal" : "Detalles"}
            </span>
          </div>
          <div className="flex gap-1 pt-0.5">
            <div className="h-0.5 flex-1 rounded-full bg-brand-blue" />
            <div className={cn(
              "h-0.5 flex-1 rounded-full transition-colors",
              step === 2 ? "bg-brand-blue" : "bg-border"
            )} />
          </div>
        </DialogHeader>

        <div className="py-1">
          {step === 1 ? (
            <SucursalStep
              sucursales={sucursales}
              selected={form.sucursalId}
              onSelect={(id) => patch({ sucursalId: id, equipoId: "", titulo: "" })}
            />
          ) : (
            <DetallesStep
              form={form}
              onChange={patch}
              sucursales={sucursales}
              equiposPorSucursal={equiposPorSucursal}
              tecnicos={tecnicos}
            />
          )}
        </div>

        <div className="-mx-4 -mb-4 flex items-center justify-between rounded-b-xl border-t border-border bg-bg-secondary px-4 py-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft size={14} />
              Volver
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          )}

          {step === 1 ? (
            <Button size="sm" disabled={!canContinue} onClick={() => setStep(2)}>
              Continuar
              <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled={!canSubmit || loading} onClick={handleSubmit}>
              {loading ? "Creando…" : "Crear orden"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
