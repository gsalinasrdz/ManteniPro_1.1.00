"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearEquipo } from "@/lib/actions/equipo";
import { toast } from "sonner";

type Sucursal = { id: string; nombre: string };

interface NuevoEquipoModalProps {
  open:       boolean;
  onClose:    () => void;
  sucursales: Sucursal[];
  onCreated:  () => void;
}

const CRITICIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
const CRITICIDAD_LABEL: Record<string, string> = {
  ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};

export function NuevoEquipoModal({ open, onClose, sucursales, onCreated }: NuevoEquipoModalProps) {
  const [sucursalId, setSucursalId] = useState("");
  const [tipo,       setTipo]       = useState("");
  const [area,       setArea]       = useState("");
  const [marca,      setMarca]      = useState("");
  const [modelo,     setModelo]     = useState("");
  const [criticidad, setCriticidad] = useState("MEDIA");
  const [loading,    setLoading]    = useState(false);

  function reset() {
    setSucursalId(""); setTipo(""); setArea("");
    setMarca(""); setModelo(""); setCriticidad("MEDIA");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sucursalId || !tipo.trim() || !area.trim() || !marca.trim() || !modelo.trim()) return;
    setLoading(true);
    const result = await crearEquipo({ sucursalId, tipo: tipo.trim(), area: area.trim(), marca: marca.trim(), modelo: modelo.trim(), criticidad });
    setLoading(false);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    toast.success("Equipo creado");
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
          <h2 className="text-sm font-semibold text-text-primary">Nuevo equipo</h2>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          {/* Sucursal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Sucursal *</label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              required
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
            >
              <option value="">Seleccionar sucursal…</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tipo + Área */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Tipo de equipo *</label>
              <input
                type="text"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Ej: Freidora"
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Área *</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej: Cocina caliente"
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Marca + Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Marca *</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: Pitco"
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Modelo *</label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: SG14"
                required
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Criticidad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Criticidad *</label>
            <div className="flex gap-2">
              {CRITICIDADES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCriticidad(c)}
                  className={cn(
                    "h-8 flex-1 rounded-lg border text-xs font-medium transition-colors",
                    criticidad === c
                      ? c === "ALTA"
                        ? "border-status-danger bg-status-danger-bg text-status-danger"
                        : c === "MEDIA"
                        ? "border-status-warn bg-status-warn-bg text-status-warn"
                        : "border-status-ok bg-status-ok-bg text-status-ok"
                      : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                  )}
                >
                  {CRITICIDAD_LABEL[c]}
                </button>
              ))}
            </div>
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
              {loading ? "Creando…" : "Crear equipo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
