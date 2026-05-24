"use client";

import { useState, useTransition } from "react";
import { DollarSign, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCostosOT } from "@/lib/actions/factura";
import { toast } from "sonner";

interface CostosSectionProps {
  otId:           string;
  costoEstimado:  number | null;
  costoReal:      number | null;
  onUpdated:      (estimado: number | null, real: number | null) => void;
}

function fmt(n: number | null) {
  if (n === null || n === undefined) return "";
  return n.toString();
}

export function CostosSection({ otId, costoEstimado, costoReal, onUpdated }: CostosSectionProps) {
  const [estimado, setEstimado] = useState(fmt(costoEstimado));
  const [real, setReal]         = useState(fmt(costoReal));
  const [pending, start]        = useTransition();

  const excedido = costoReal && costoEstimado && costoReal > costoEstimado;
  const diff     = costoReal && costoEstimado ? costoReal - costoEstimado : null;

  function handleGuardar() {
    start(async () => {
      const e = estimado ? parseFloat(estimado) : null;
      const r = real     ? parseFloat(real)     : null;
      const res = await setCostosOT(otId, e, r);
      if (!res.ok) { toast.error("Error", { description: res.error }); return; }
      onUpdated(e, r);
      toast.success("Costos actualizados");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
        Costos
      </span>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-text-tertiary">Estimado</label>
          <div className="relative">
            <DollarSign size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimado}
              onChange={(e) => setEstimado(e.target.value)}
              placeholder="0.00"
              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-6 pr-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-text-tertiary">Real (al cierre)</label>
          <div className="relative">
            <DollarSign size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={real}
              onChange={(e) => setReal(e.target.value)}
              placeholder="0.00"
              className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-6 pr-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
        </div>
      </div>

      {diff !== null && (
        <div className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
          excedido
            ? "bg-status-danger-bg text-status-danger"
            : "bg-status-ok-bg text-status-ok"
        )}>
          {excedido
            ? <TrendingUp size={12} />
            : <TrendingDown size={12} />}
          {excedido
            ? `Excedido en $${Math.abs(diff).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
            : `Dentro del estimado ($${Math.abs(diff).toLocaleString("es-MX", { minimumFractionDigits: 2 })} de margen)`}
        </div>
      )}

      <button
        onClick={handleGuardar}
        disabled={pending}
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-brand-blue text-xs font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-50"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : null}
        Guardar costos
      </button>
    </div>
  );
}
