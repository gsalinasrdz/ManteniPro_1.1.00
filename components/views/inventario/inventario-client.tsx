"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/atoms/badge";
import { KpiCard } from "@/components/atoms/kpi";
import { cn } from "@/lib/utils";
import {
  Search, SlidersHorizontal, Package, Plus, FileText,
} from "lucide-react";
import { RefaccionModal, type RefaccionRow } from "./refaccion-modal";
import { RefaccionDrawer } from "./refaccion-drawer";
import { XmlImportModal } from "./xml-import-modal";

// ── Types ──────────────────────────────────────────────────────

interface InventarioClientProps {
  refacciones: RefaccionRow[];
}

// ── Stock logic ────────────────────────────────────────────────

function nivelStock(r: RefaccionRow): "ok" | "porPedir" | "bajo" | "agotado" {
  if (r.stock === 0)              return "agotado";
  if (r.stock < r.min)           return "bajo";
  if (r.stock <= r.puntoReorden) return "porPedir";
  return "ok";
}

const NIVEL_TONE: Record<string, "ok" | "warn" | "danger"> = {
  ok:       "ok",
  porPedir: "warn",
  bajo:     "danger",
  agotado:  "danger",
};

const NIVEL_LABEL: Record<string, string> = {
  ok:       "OK",
  porPedir: "Por pedir",
  bajo:     "Bajo mínimo",
  agotado:  "Agotado",
};

// ── Stock bar with 3 zones ─────────────────────────────────────

function StockBar({ r }: { r: RefaccionRow }) {
  const max      = r.max || Math.max(r.stock, r.puntoReorden, r.min, 1) * 2;
  const nivel    = nivelStock(r);
  const pctFill  = Math.min((r.stock / max) * 100, 100);
  const pctMin   = Math.min((r.min / max) * 100, 100);
  const pctReord = Math.min((r.puntoReorden / max) * 100, 100);

  const barColor =
    nivel === "agotado" || nivel === "bajo" ? "bg-status-danger-mid" :
    nivel === "porPedir"                    ? "bg-status-warn-mid"   :
                                              "bg-status-ok";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", barColor)}
          style={{ width: `${pctFill}%` }}
        />
        {r.min > 0 && (
          <div className="absolute inset-y-0 w-px bg-status-danger/50"
            style={{ left: `${pctMin}%` }} />
        )}
        {r.puntoReorden > 0 && (
          <div className="absolute inset-y-0 w-px bg-status-warn/50"
            style={{ left: `${pctReord}%` }} />
        )}
      </div>
      <span className={cn(
        "tabular-nums text-xs font-medium",
        nivel === "agotado" || nivel === "bajo" ? "text-status-danger" :
        nivel === "porPedir"                    ? "text-status-warn"   :
                                                  "text-text-primary"
      )}>
        {r.stock}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function InventarioClient({ refacciones: initialRefacciones }: InventarioClientProps) {
  const [refacciones, setRefacciones] = useState<RefaccionRow[]>(initialRefacciones);
  const [busqueda, setBusqueda]       = useState("");
  const [soloAlerta, setSoloAlerta]   = useState(false);
  const [categoriaActiva, setCat]     = useState<string | null>(null);
  const [selectedRef, setSelectedRef] = useState<RefaccionRow | null>(null);
  const [modalNueva, setModalNueva]   = useState(false);
  const [modalXML, setModalXML]       = useState(false);

  useEffect(() => { setRefacciones(initialRefacciones); }, [initialRefacciones]);

  const categorias = useMemo(() => {
    const set = new Set(refacciones.map((r) => r.categoria));
    return Array.from(set).sort();
  }, [refacciones]);

  const kpis = useMemo(() => {
    const agotados   = refacciones.filter((r) => r.stock === 0).length;
    const bajo       = refacciones.filter((r) => r.stock > 0 && r.stock < r.min).length;
    const porPedir   = refacciones.filter(
      (r) => r.stock > 0 && r.stock >= r.min && r.stock <= r.puntoReorden
    ).length;
    const valorTotal = refacciones.reduce((acc, r) => acc + r.stock * r.costo, 0);
    return { total: refacciones.length, agotados, bajo, porPedir, valorTotal };
  }, [refacciones]);

  const filtradas = useMemo(() => {
    return refacciones.filter((r) => {
      if (categoriaActiva && r.categoria !== categoriaActiva) return false;
      if (soloAlerta && nivelStock(r) === "ok") return false;
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

  const refaccionesParaXML = useMemo(
    () => refacciones.map((r) => ({ id: r.id, sku: r.sku, nombre: r.nombre, stock: r.stock })),
    [refacciones]
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Total artículos"
            value={kpis.total}
            icon={<Package size={16} />}
            variant="default"
          />
          <KpiCard
            label="Por pedir"
            value={kpis.porPedir}
            icon={<Package size={16} />}
            variant={kpis.porPedir > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="Críticos / Agotados"
            value={kpis.bajo + kpis.agotados}
            icon={<Package size={16} />}
            variant={(kpis.bajo + kpis.agotados) > 0 ? "danger" : "ok"}
          />
          <KpiCard
            label="Valor inventario"
            value={`$${kpis.valorTotal.toLocaleString("es-MX", {
              minimumFractionDigits: 0, maximumFractionDigits: 0,
            })}`}
            variant="default"
          />
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCat(null)}
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
              onClick={() => setCat(categoriaActiva === cat ? null : cat)}
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
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
          <span className="text-sm text-text-tertiary">
            {filtradas.length} de {refacciones.length}
            {filtradas.length < refacciones.length && (
              <span className="ml-2 text-text-tertiary">
                · ${valorFiltrado.toLocaleString("es-MX", {
                  minimumFractionDigits: 0, maximumFractionDigits: 0,
                })} en stock
              </span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setModalXML(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-secondary transition-colors hover:bg-bg-secondary"
            >
              <FileText size={13} />
              Importar XML
            </button>
            <button
              onClick={() => setModalNueva(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              <Plus size={13} />
              Nueva refacción
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary">
                {[
                  "SKU", "Nombre", "Categoría", "Stock",
                  "Mín / Reorden / Máx",
                  "Estado", "Costo unit.", "Valor stock", "Ubicación",
                ].map((h) => (
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
                    No hay artículos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((r) => {
                  const nivel     = nivelStock(r);
                  const isSelected = selectedRef?.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRef(r)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-brand-blue-light"
                          : nivel === "agotado" || nivel === "bajo"
                          ? "bg-status-danger-bg/20 hover:bg-status-danger-bg/40"
                          : nivel === "porPedir"
                          ? "bg-status-warn-bg/10 hover:bg-status-warn-bg/20"
                          : "hover:bg-bg-secondary"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-tertiary">
                        {r.sku}
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <span className="line-clamp-2 font-medium text-text-primary">{r.nombre}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{r.categoria}</td>
                      <td className="px-4 py-3">
                        <StockBar r={r} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums">
                        <span className="text-status-danger">{r.min}</span>
                        <span className="text-text-tertiary"> / </span>
                        <span className="font-medium text-status-warn">{r.puntoReorden}</span>
                        <span className="text-text-tertiary"> / </span>
                        <span className="text-text-secondary">{r.max}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={NIVEL_TONE[nivel]} dot={nivel !== "ok"}>
                          {NIVEL_LABEL[nivel]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-text-secondary">
                        ${r.costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-text-secondary">
                        ${(r.stock * r.costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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

      <RefaccionDrawer
        refaccion={selectedRef}
        categorias={categorias}
        onClose={() => setSelectedRef(null)}
      />

      <RefaccionModal
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        categorias={categorias}
      />

      <XmlImportModal
        open={modalXML}
        onClose={() => setModalXML(false)}
        refacciones={refaccionesParaXML}
        categorias={categorias}
      />
    </>
  );
}
