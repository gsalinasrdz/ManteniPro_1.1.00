"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
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
import { crearIncidencia } from "@/lib/actions/incidencia";
import { shortenSucursal } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type Severidad = "ALTA" | "MEDIA" | "BAJA";

type SucursalOption = { id: string; nombre: string };
type EquipoOption   = { id: string; cu: string; tipo: string; area: string };

interface ReportarIncidenciaModalProps {
  open:    boolean;
  onClose: () => void;
  sucursales:         SucursalOption[];
  equiposPorSucursal: Record<string, EquipoOption[]>;
}

interface FormState {
  sucursalId:  string;
  equipoId:    string;
  titulo:      string;
  descripcion: string;
  severidad:   Severidad;
}

const EMPTY_FORM: FormState = {
  sucursalId:  "",
  equipoId:    "",
  titulo:      "",
  descripcion: "",
  severidad:   "MEDIA",
};

// ── Severidad config ───────────────────────────────────────────

const SEV_CONFIG: Record<Severidad, {
  label:  string;
  desc:   string;
  active: string;
  icon:   string;
}> = {
  ALTA: {
    label:  "Alta",
    desc:   "El equipo no funciona o representa riesgo",
    active: "border-status-danger bg-status-danger-bg text-status-danger",
    icon:   "🔴",
  },
  MEDIA: {
    label:  "Media",
    desc:   "Funciona con falla parcial o rendimiento bajo",
    active: "border-status-warn bg-status-warn-bg text-status-warn",
    icon:   "🟡",
  },
  BAJA: {
    label:  "Baja",
    desc:   "Falla menor, no afecta la operación",
    active: "border-status-ok bg-status-ok-bg text-status-ok",
    icon:   "🟢",
  },
};

// ── Step 1: Sucursal ───────────────────────────────────────────

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
        Selecciona la sucursal donde ocurrió la falla o anomalía.
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
                ? "border-brand-blue bg-brand-blue-light font-medium text-brand-blue"
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

// ── Step 2: Detalles ───────────────────────────────────────────

function DetallesStep({
  form,
  onChange,
  sucursales,
  equiposPorSucursal,
}: {
  form:               FormState;
  onChange:           (p: Partial<FormState>) => void;
  sucursales:         SucursalOption[];
  equiposPorSucursal: Record<string, EquipoOption[]>;
}) {
  const sucursal = sucursales.find((s) => s.id === form.sucursalId);
  const equipos  = equiposPorSucursal[form.sucursalId] ?? [];

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
          onChange={(e) => onChange({ equipoId: e.target.value })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="" disabled>Selecciona el equipo afectado…</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.cu} — {eq.tipo} ({eq.area})
            </option>
          ))}
        </select>
      </div>

      {/* Severidad */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          Severidad <span className="text-status-danger">*</span>
        </Label>
        <div className="flex flex-col gap-1.5">
          {(["ALTA", "MEDIA", "BAJA"] as Severidad[]).map((sev) => {
            const cfg    = SEV_CONFIG[sev];
            const active = form.severidad === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => onChange({ severidad: sev })}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                  active
                    ? cfg.active
                    : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                )}
              >
                <span className="text-sm">{cfg.icon}</span>
                <div>
                  <div className="text-xs font-semibold">{cfg.label}</div>
                  <div className="text-[10px] opacity-80">{cfg.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Título */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          ¿Qué está pasando? <span className="text-status-danger">*</span>
        </Label>
        <Input
          value={form.titulo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ titulo: e.target.value })
          }
          placeholder="Ej: Freidora no alcanza temperatura, hace ruido extraño…"
          className="h-8 text-sm"
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-text-secondary">
          Descripción adicional{" "}
          <span className="font-normal text-text-tertiary">(opcional)</span>
        </Label>
        <textarea
          value={form.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          placeholder="Cuándo empezó, qué síntomas observas, si afecta la operación…"
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-text-primary placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────

export function ReportarIncidenciaModal({
  open,
  onClose,
  sucursales,
  equiposPorSucursal,
}: ReportarIncidenciaModalProps) {
  const router = useRouter();
  const [step, setStep]       = useState<1 | 2>(1);
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  const canContinue = Boolean(form.sucursalId);
  const canSubmit   = Boolean(form.equipoId) && Boolean(form.titulo.trim());

  function handleClose() {
    onClose();
    setTimeout(() => { setStep(1); setForm(EMPTY_FORM); }, 200);
  }

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);

    const result = await crearIncidencia({
      equipoId:    form.equipoId,
      titulo:      form.titulo,
      descripcion: form.descripcion,
      severidad:   form.severidad,
    });

    setLoading(false);

    if (!result.ok) {
      toast.error("Error al reportar", { description: result.error });
      return;
    }

    const sucursal = sucursales.find((s) => s.id === form.sucursalId);
    const equipo   = (equiposPorSucursal[form.sucursalId] ?? []).find(
      (e) => e.id === form.equipoId
    );
    toast.success("Incidencia reportada", {
      description: `${equipo?.cu} · ${shortenSucursal(sucursal?.nombre ?? "")} · Severidad ${form.severidad}`,
    });

    handleClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg bg-bg-primary" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-status-warn" />
              <DialogTitle className="text-base font-semibold text-text-primary">
                Reportar incidencia
              </DialogTitle>
            </div>
            <span className="text-xs text-text-tertiary">
              Paso {step} de 2 · {step === 1 ? "Sucursal" : "Detalles"}
            </span>
          </div>
          <div className="flex gap-1 pt-0.5">
            <div className="h-0.5 flex-1 rounded-full bg-status-warn" />
            <div className={cn(
              "h-0.5 flex-1 rounded-full transition-colors",
              step === 2 ? "bg-status-warn" : "bg-border"
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
            <Button
              size="sm"
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
              className="bg-status-warn text-white hover:bg-status-warn/90"
            >
              {loading ? "Reportando…" : "Reportar incidencia"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
