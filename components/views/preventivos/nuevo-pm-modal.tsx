"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { crearPreventivo } from "@/lib/actions/preventivo";
import { toast } from "sonner";

type EquipoOption = { id: string; cu: string; tipo: string; sucursalId: string; sucursalNombre: string };
type TecnicoOption = { id: string; nombre: string; iniciales: string };

interface NuevoPMModalProps {
  open:      boolean;
  onClose:   () => void;
  equipos:   EquipoOption[];
  tecnicos:  TecnicoOption[];
  onCreated: () => void;
}

const FRECUENCIAS = [
  { value: "SEMANAL",    label: "Semanal"    },
  { value: "QUINCENAL",  label: "Quincenal"  },
  { value: "MENSUAL",    label: "Mensual"    },
  { value: "BIMESTRAL",  label: "Bimestral"  },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "SEMESTRAL",  label: "Semestral"  },
  { value: "ANUAL",      label: "Anual"      },
];

export function NuevoPMModal({ open, onClose, equipos, tecnicos, onCreated }: NuevoPMModalProps) {
  const [sucursalId, setSucursalId] = useState("");
  const [equipoId,   setEquipoId]   = useState("");
  const [tarea,      setTarea]      = useState("");
  const [frecuencia, setFrecuencia] = useState("MENSUAL");
  const [prox,       setProx]       = useState("");
  const [tecnicoId,  setTecnicoId]  = useState("");
  const [loading,    setLoading]    = useState(false);

  const sucursalesUnicas = useMemo(() => {
    const map = new Map<string, string>();
    for (const eq of equipos) map.set(eq.sucursalId, eq.sucursalNombre);
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [equipos]);

  const equiposFiltrados = useMemo(
    () => sucursalId ? equipos.filter((e) => e.sucursalId === sucursalId) : equipos,
    [equipos, sucursalId]
  );

  function reset() {
    setSucursalId(""); setEquipoId(""); setTarea("");
    setFrecuencia("MENSUAL"); setProx(""); setTecnicoId("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId || !tarea.trim() || !prox) return;
    setLoading(true);
    const result = await crearPreventivo({
      equipoId,
      tarea:      tarea.trim(),
      frecuencia,
      prox,
      tecnicoId:  tecnicoId || undefined,
    });
    setLoading(false);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    toast.success("Preventivo creado");
    reset();
    onCreated();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Nuevo preventivo</h2>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          {/* Sucursal → Equipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Sucursal</label>
              <select
                value={sucursalId}
                onChange={(e) => { setSucursalId(e.target.value); setEquipoId(""); }}
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
              >
                <option value="">Todas…</option>
                {sucursalesUnicas.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Equipo *</label>
              <select
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
              >
                <option value="">Seleccionar…</option>
                {equiposFiltrados.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.tipo} — {eq.cu}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Tarea *</label>
            <input
              type="text"
              value={tarea}
              onChange={(e) => setTarea(e.target.value)}
              placeholder="Ej: Limpieza de filtros"
              required
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>

          {/* Frecuencia + Próxima fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Frecuencia *</label>
              <select
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
              >
                {FRECUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Próxima fecha *</label>
              <input
                type="date"
                value={prox}
                onChange={(e) => setProx(e.target.value)}
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Técnico asignado (opcional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Técnico asignado</label>
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="h-9 rounded-lg border border-border px-4 text-sm text-text-secondary hover:bg-bg-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
            >
              {loading ? "Creando…" : "Crear preventivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
