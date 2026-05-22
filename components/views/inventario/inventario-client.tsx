"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { KpiCard } from "@/components/atoms/kpi";
import { cn } from "@/lib/utils";
import type { Refaccion } from "@prisma/client";
import { Search, SlidersHorizontal, Package } from "lucide-react";

type RefaccionRow = Omit<Refaccion, "costo"> & { costo: number };

interface InventarioClientProps {
  refacciones: RefaccionRow[];
}

function nivelStock(stock: number, min: number): "ok" | "bajo" | "agotado" {
  if (stock === 0) return "agotado";
  if (stock < min) return "bajo";
  return "ok";
}

const NIVEL_TONE = {
  ok:      "ok",
  bajo:    "warn",
  agotado: "danger",
} as const;

const NIVEL_LABEL = {
  ok:      "OK",
  bajo:    "Bajo mínimo",
  agotado: "Agotado",
} as const;

function StockBar({ stock, min, max }: { stock: number; min: number; max: number }) {
  const pct = max > 0 ? Math.min((stock / max) * 100, 100) : 0;
  const nivel = nivelStock(stock, min);
  const barColor =
    nivel === "agotado" ? "bg-status-danger-mid" :
    nivel === "bajo"    ? "bg-status-warn-mid"   :
                          "bg-status-ok";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-tertiary">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn(
        "tabular-nums text-xs font-medium",
        nivel === "agotado" ? "text-status-danger" :
        nivel === "bajo"    ? "text-status-warn"   :
                              "text-text-primary"
      )}>
        {stock}
      </span>
    </div>
  );
}

export function InventarioClient({ refacciones }: InventarioClientProps) {
  const [busqueda, setBusqueda]       = useState("");
  const [soloAlerta, setSoloAlerta]   = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);

  const categorias = useMemo(() => {
    const set = new Set(refacciones.map((r) => r.categoria));
    return Array.from(set).sort();
  }, [refacciones]);

  const kpis = useMemo(() => {
    const agotados    = refacciones.filter((r) => r.stock === 0).length;
    const bajoMinimo  = refacciones.filter((r) => r.stock > 0 && r.stock < r.min).length;
    const valorTotal  = refacciones.reduce((acc, r) => acc + r.stock * r.costo, 0);
    return { total: refacciones.length, agotados, bajoMinimo, valorTotal };
  }, [refacciones]);

  const filtradas = useMemo(() => {
    return refacciones.filter((r) => {
      if (categoriaActiva && r.categoria !== categoriaActiva) return false;
      if (soloAlerta && nivelStock(r.stock, r.min) === "ok") return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          r.sku.toLowerCase().includes(q) ||
          r.nombre.toLowerCase().includes(q) ||
          r.categoria.toLowerCase().includes(q) ||
          (r.ubicacion ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [refacciones, categoriaActiva, busqueda, soloAlerta]);

  const valorFiltrado = useMemo(
    () => filtradas.reduce((acc, r) => acc + r.stock * r.costo, 0),
    [filtradas]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total refacciones"
          value={kpis.total}
          icon={<Package size={16} />}
          variant="default"
        />
        <KpiCard
          label="Bajo mínimo"
          value={kpis.bajoMinimo}
          icon={<Package size={16} />}
          variant={kpis.bajoMinimo > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Agotados"
          value={kpis.agotados}
          icon={<Package size={16} />}
          variant={kpis.agotados > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Valor inventario"
          value={`$${kpis.valorTotal.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          variant="default"
        />
      </div>

      {/* Chips de categoría */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoriaActiva(null)}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            categoriaActiva === null
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
          )}
        >
          Todas
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(categoriaActiva === cat ? null : cat)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              categoriaActiva === cat
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            placeholder="Buscar por SKU, nombre, ubicación…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSoloAlerta(!soloAlerta)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
            soloAlerta
              ? "border-brand-blue bg-brand-blue-light text-brand-blue"
              : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
          )}
        >
          <SlidersHorizontal size={13} />
          Solo alertas
        </button>
        <span className="ml-auto text-sm text-text-tertiary">
          {filtradas.length} de {refacciones.length}
          {filtradas.length < refacciones.length && (
            <span className="ml-2 text-text-tertiary">
              · ${valorFiltrado.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} en stock
            </span>
          )}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              {["SKU", "Nombre", "Categoría", "Stock", "Mín / Máx", "Estado", "Costo unit.", "Valor en stock", "Ubicación"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-text-tertiary">
                  No hay refacciones que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filtradas.map((r) => {
                const nivel = nivelStock(r.stock, r.min);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "transition-colors hover:bg-bg-secondary",
                      nivel === "agotado" && "bg-status-danger-bg/30"
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-tertiary whitespace-nowrap">
                      {r.sku}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 font-medium text-text-primary">
                      <span className="line-clamp-2">{r.nombre}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {r.categoria}
                    </td>
                    <td className="px-4 py-3">
                      <StockBar stock={r.stock} min={r.min} max={r.max} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-tertiary tabular-nums whitespace-nowrap">
                      {r.min} / {r.max}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={NIVEL_TONE[nivel]} dot={nivel !== "ok"}>
                        {NIVEL_LABEL[nivel]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-text-secondary whitespace-nowrap">
                      ${r.costo.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-text-secondary whitespace-nowrap">
                      ${(r.stock * r.costo).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-tertiary">
                      {r.ubicacion ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
