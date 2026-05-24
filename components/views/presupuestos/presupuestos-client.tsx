"use client";

import { useState, useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { format, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign, Receipt, TrendingUp, TrendingDown,
  CheckCircle2, Clock, XCircle, Download, Printer, ChevronDown, ChevronUp, Loader2, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { setPresupuestoSucursal } from "@/lib/actions/factura";
import type { GastosDataPoint } from "./gastos-chart";

const GastosChart = dynamic(
  () => import("./gastos-chart").then((m) => m.GastosChart),
  { ssr: false, loading: () => <div className="flex h-[200px] items-center justify-center text-xs text-text-tertiary">Cargando gráfica…</div> }
);

// ── Types ─────────────────────────────────────────────────────────

type Sucursal = { id: string; nombre: string; zonaId: string | null };
type Tecnico  = { id: string; nombre: string; iniciales: string };

type FacturaRow = {
  id: string; numero: string; uuid: string | null;
  proveedor: string; rfcEmisor: string | null;
  monto: number; subtotal: number | null; iva: number | null;
  fechaEmision: Date; fechaPago: Date | null;
  estado: "PENDIENTE" | "PAGADA" | "CANCELADA"; concepto: string | null;
  ordenId: string; tecnicoId: string | null;
  orden: { numero: string; titulo: string; equipo: { sucursal: { id: string; nombre: string } } };
  tecnico: { nombre: string; iniciales: string } | null;
};

type OTCosto = {
  id: string; numero: string; titulo: string;
  costoEstimado: number | null; costo: number | null;
  estado: string; cerrada: boolean; tecnicoId: string | null;
  equipo: { sucursal: { id: string; nombre: string } };
  tecnico: { nombre: string; iniciales: string } | null;
};

type Presupuesto = { sucursalId: string; periodo: string; monto: number };

interface Props {
  sucursales: Sucursal[];
  tecnicos: Tecnico[];
  facturas: FacturaRow[];
  ordenesCostos: OTCosto[];
  presupuestos: Presupuesto[];
}

// ── Helpers ────────────────────────────────────────────────────────

const mesActual = format(new Date(), "yyyy-MM");

function periodoLabel(p: string) {
  const [y, m] = p.split("-");
  return format(new Date(Number(y), Number(m) - 1, 1), "MMM yyyy", { locale: es });
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function semaphore(pct: number) {
  if (pct >= 100) return "bg-status-danger";
  if (pct >= 90)  return "bg-status-warn";
  if (pct >= 75)  return "bg-amber-400";
  return "bg-status-ok";
}

function exportCSV(rows: FacturaRow[]) {
  const headers = ["Fecha","Proveedor","RFC","Concepto","Orden","Sucursal","Técnico","Monto","IVA","Estado","UUID"];
  const lines = rows.map((f) => [
    format(new Date(f.fechaEmision), "yyyy-MM-dd"),
    `"${f.proveedor}"`,
    f.rfcEmisor ?? "",
    `"${f.concepto ?? ""}"`,
    f.orden.numero,
    `"${f.orden.equipo.sucursal.nombre}"`,
    f.tecnico?.nombre ?? "",
    Number(f.monto).toFixed(2),
    Number(f.iva ?? 0).toFixed(2),
    f.estado,
    f.uuid ?? "",
  ].join(","));
  const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `facturas_${mesActual}.csv`;
  a.click();
}

// ── Tab buttons ───────────────────────────────────────────────────

type Tab = "sucursales" | "tecnicos" | "historial";

const TABS: { id: Tab; label: string }[] = [
  { id: "sucursales", label: "Por Sucursal" },
  { id: "tecnicos",   label: "Por Técnico" },
  { id: "historial",  label: "Historial" },
];

// ── Main component ─────────────────────────────────────────────────

export function PresupuestosClient({ sucursales, tecnicos, facturas, ordenesCostos, presupuestos }: Props) {
  const [tab, setTab] = useState<Tab>("sucursales");

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Presupuestos & Facturas</h1>
          <p className="mt-0.5 text-sm text-text-tertiary">Control de costos por sucursal y técnico</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-secondary print:hidden"
        >
          <Printer size={13} />
          Imprimir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-brand-blue text-brand-blue"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sucursales" && (
        <TabSucursales
          sucursales={sucursales}
          facturas={facturas}
          presupuestos={presupuestos}
        />
      )}
      {tab === "tecnicos" && (
        <TabTecnicos
          tecnicos={tecnicos}
          facturas={facturas}
          ordenesCostos={ordenesCostos}
        />
      )}
      {tab === "historial" && (
        <TabHistorial
          sucursales={sucursales}
          tecnicos={tecnicos}
          facturas={facturas}
        />
      )}
    </div>
  );
}

// ── Tab 1: Por Sucursal ────────────────────────────────────────────

function TabSucursales({
  sucursales, facturas, presupuestos,
}: {
  sucursales: Sucursal[];
  facturas: FacturaRow[];
  presupuestos: Presupuesto[];
}) {
  const [periodo, setPeriodo] = useState(mesActual);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [pending, start] = useTransition();
  const [showChart, setShowChart] = useState(true);

  // Build list of available periods (last 6 months)
  const periodos = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) =>
      format(subMonths(startOfMonth(new Date()), i), "yyyy-MM")
    );
  }, []);

  // Build chart data: last 6 months × sucursal, pagadas only
  const chartData = useMemo<GastosDataPoint[]>(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      format(subMonths(startOfMonth(new Date()), 5 - i), "yyyy-MM")
    );
    return months.map((m) => {
      const label = periodoLabel(m);
      const point: GastosDataPoint = { mes: label };
      for (const s of sucursales) {
        point[s.nombre] = facturas
          .filter(
            (f) =>
              f.orden.equipo.sucursal.id === s.id &&
              format(new Date(f.fechaEmision), "yyyy-MM") === m &&
              f.estado === "PAGADA"
          )
          .reduce((sum, f) => sum + Number(f.monto), 0);
      }
      return point;
    });
  }, [facturas, sucursales]);

  // Facturas del período seleccionado
  const facturasPeriodo = useMemo(() =>
    facturas.filter((f) => format(new Date(f.fechaEmision), "yyyy-MM") === periodo),
  [facturas, periodo]);

  // KPIs globales del período
  const kpi = useMemo(() => {
    const pagadas  = facturasPeriodo.filter((f) => f.estado === "PAGADA");
    const pendientes = facturasPeriodo.filter((f) => f.estado === "PENDIENTE");
    const totalGastado  = pagadas.reduce((s, f) => s + Number(f.monto), 0);
    const totalPendiente = pendientes.reduce((s, f) => s + Number(f.monto), 0);
    const totalPresupuesto = presupuestos
      .filter((p) => p.periodo === periodo)
      .reduce((s, p) => s + Number(p.monto), 0);
    return { totalGastado, totalPendiente, totalPresupuesto, nPagadas: pagadas.length, nPendientes: pendientes.length };
  }, [facturasPeriodo, presupuestos, periodo]);

  // Por sucursal
  const rows = useMemo(() =>
    sucursales.map((s) => {
      const fs = facturasPeriodo.filter((f) => f.orden.equipo.sucursal.id === s.id);
      const gastado   = fs.filter((f) => f.estado === "PAGADA").reduce((acc, f) => acc + Number(f.monto), 0);
      const pendiente = fs.filter((f) => f.estado === "PENDIENTE").reduce((acc, f) => acc + Number(f.monto), 0);
      const pres = presupuestos.find((p) => p.sucursalId === s.id && p.periodo === periodo);
      const presupuesto = pres ? Number(pres.monto) : 0;
      const pct = presupuesto > 0 ? Math.round((gastado / presupuesto) * 100) : 0;
      return { ...s, gastado, pendiente, presupuesto, pct, nFacturas: fs.length };
    }),
  [sucursales, facturasPeriodo, presupuestos, periodo]);

  function startEdit(id: string, current: number) {
    setEditingId(id);
    setEditMonto(current > 0 ? current.toString() : "");
  }

  function savePresupuesto(sucursalId: string) {
    const monto = parseFloat(editMonto);
    if (isNaN(monto) || monto < 0) { toast.error("Monto inválido"); return; }
    start(async () => {
      const res = await setPresupuestoSucursal(sucursalId, periodo, monto);
      if (!res.ok) { toast.error("Error", { description: res.error }); return; }
      toast.success("Presupuesto actualizado");
      setEditingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de período */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary">Período:</span>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="h-7 rounded-md border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
        >
          {periodos.map((p) => (
            <option key={p} value={p}>{periodoLabel(p)}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiBox label="Total gastado" value={`$${fmt(kpi.totalGastado)}`} icon={DollarSign} color="text-status-ok" />
        <KpiBox label="Facturas pendientes" value={`$${fmt(kpi.totalPendiente)}`} sub={`${kpi.nPendientes} facturas`} icon={Clock} color="text-status-warn" />
        <KpiBox label="Presupuesto total" value={`$${fmt(kpi.totalPresupuesto)}`} icon={Receipt} color="text-brand-blue" />
        <KpiBox
          label="Disponible"
          value={`$${fmt(Math.max(0, kpi.totalPresupuesto - kpi.totalGastado))}`}
          icon={kpi.totalGastado > kpi.totalPresupuesto ? TrendingUp : TrendingDown}
          color={kpi.totalGastado > kpi.totalPresupuesto ? "text-status-danger" : "text-status-ok"}
        />
      </div>

      {/* Chart: gasto por sucursal últimos 6 meses */}
      <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
        <button
          onClick={() => setShowChart((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <BarChart2 size={13} className="text-text-tertiary" />
            Gasto por sucursal — últimos 6 meses
          </div>
          {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {showChart && (
          <div className="px-4 pb-4">
            <GastosChart data={chartData} sucursales={sucursales} />
          </div>
        )}
      </div>

      {/* Tabla por sucursal */}
      <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Sucursal</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Presupuesto</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Gastado</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Pendiente</th>
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary w-36">Uso</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Facturas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{row.nombre}</td>
                <td className="px-4 py-3 text-right">
                  {editingId === row.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editMonto}
                        onChange={(e) => setEditMonto(e.target.value)}
                        autoFocus
                        className="w-24 h-6 rounded border border-brand-blue bg-bg-primary px-1.5 text-right text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => savePresupuesto(row.id)}
                        disabled={pending}
                        className="h-6 rounded bg-brand-blue px-2 text-[10px] text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {pending ? <Loader2 size={10} className="animate-spin" /> : "✓"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-6 rounded border border-border px-2 text-[10px] text-text-secondary hover:bg-bg-secondary"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(row.id, row.presupuesto)}
                      className="text-text-primary hover:text-brand-blue transition-colors"
                      title="Click para editar presupuesto"
                    >
                      {row.presupuesto > 0 ? `$${fmt(row.presupuesto)}` : <span className="text-text-tertiary">Sin asignar</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-primary">${fmt(row.gastado)}</td>
                <td className="px-4 py-3 text-right text-status-warn">{row.pendiente > 0 ? `$${fmt(row.pendiente)}` : "—"}</td>
                <td className="px-4 py-3">
                  {row.presupuesto > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", semaphore(row.pct))}
                          style={{ width: `${Math.min(row.pct, 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-medium w-8 text-right",
                        row.pct >= 100 ? "text-status-danger" : row.pct >= 90 ? "text-status-warn" : "text-text-secondary"
                      )}>
                        {row.pct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-tertiary text-[10px]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{row.nFacturas}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-tertiary">Sin datos para este período</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-text-tertiary">Haz click en el monto de presupuesto de cualquier sucursal para editarlo.</p>
    </div>
  );
}

// ── Tab 2: Por Técnico ─────────────────────────────────────────────

function TabTecnicos({
  tecnicos, facturas, ordenesCostos,
}: {
  tecnicos: Tecnico[];
  facturas: FacturaRow[];
  ordenesCostos: OTCosto[];
}) {
  const rows = useMemo(() =>
    tecnicos.map((t) => {
      const ots = ordenesCostos.filter((o) => o.tecnicoId === t.id);
      const fs  = facturas.filter((f) => f.tecnicoId === t.id);
      const cerradas   = ots.filter((o) => o.cerrada).length;
      const montoTotal = fs.filter((f) => f.estado !== "CANCELADA").reduce((s, f) => s + Number(f.monto), 0);
      const pendientes = fs.filter((f) => f.estado === "PENDIENTE").length;
      const pagadas    = fs.filter((f) => f.estado === "PAGADA").length;
      return { ...t, nOTs: ots.length, cerradas, montoTotal, pendientes, pagadas, nFacturas: fs.length };
    }).filter((r) => r.nOTs > 0 || r.nFacturas > 0),
  [tecnicos, facturas, ordenesCostos]);

  return (
    <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-bg-secondary">
            <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Técnico</th>
            <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">OTs asignadas</th>
            <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">OTs cerradas</th>
            <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Monto facturado</th>
            <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Fact. pendientes</th>
            <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Fact. pagadas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-semibold text-brand-blue">
                    {row.iniciales}
                  </span>
                  <span className="font-medium text-text-primary">{row.nombre}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-text-primary">{row.nOTs}</td>
              <td className="px-4 py-3 text-right text-status-ok">{row.cerradas}</td>
              <td className="px-4 py-3 text-right font-medium text-text-primary">${fmt(row.montoTotal)}</td>
              <td className="px-4 py-3 text-right text-status-warn">{row.pendientes}</td>
              <td className="px-4 py-3 text-right text-status-ok">{row.pagadas}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-text-tertiary">Sin técnicos con órdenes o facturas registradas</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab 3: Historial ───────────────────────────────────────────────

function TabHistorial({
  sucursales, tecnicos, facturas,
}: {
  sucursales: Sucursal[];
  tecnicos: Tecnico[];
  facturas: FacturaRow[];
}) {
  const [sucId, setSucId]       = useState<string>("");
  const [tecId, setTecId]       = useState<string>("");
  const [query, setQuery]       = useState("");
  const [estadoFil, setEstado]  = useState<string>("");

  const filtered = useMemo(() => {
    let fs = [...facturas].sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
    if (sucId) fs = fs.filter((f) => f.orden.equipo.sucursal.id === sucId);
    if (tecId) fs = fs.filter((f) => f.tecnicoId === tecId);
    if (estadoFil) fs = fs.filter((f) => f.estado === estadoFil);
    if (query) {
      const q = query.toLowerCase();
      fs = fs.filter((f) =>
        f.proveedor.toLowerCase().includes(q) ||
        (f.rfcEmisor ?? "").toLowerCase().includes(q) ||
        (f.concepto ?? "").toLowerCase().includes(q) ||
        f.orden.numero.toLowerCase().includes(q)
      );
    }
    return fs;
  }, [facturas, sucId, tecId, estadoFil, query]);

  const totales = useMemo(() => ({
    pagado:   filtered.filter((f) => f.estado === "PAGADA").reduce((s, f) => s + Number(f.monto), 0),
    pendiente: filtered.filter((f) => f.estado === "PENDIENTE").reduce((s, f) => s + Number(f.monto), 0),
  }), [filtered]);

  const ESTADO_META = {
    PENDIENTE:  { label: "Pendiente",  cls: "bg-status-warn-bg text-status-warn",    icon: Clock },
    PAGADA:     { label: "Pagada",     cls: "bg-status-ok-bg text-status-ok",         icon: CheckCircle2 },
    CANCELADA:  { label: "Cancelada",  cls: "bg-bg-tertiary text-text-tertiary",      icon: XCircle },
  } as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar proveedor, RFC, OT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 min-w-[200px] rounded-md border border-border bg-bg-primary px-3 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
        />
        <select
          value={sucId}
          onChange={(e) => setSucId(e.target.value)}
          className="h-8 rounded-md border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select
          value={tecId}
          onChange={(e) => setTecId(e.target.value)}
          className="h-8 rounded-md border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
        >
          <option value="">Todos los técnicos</option>
          {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select
          value={estadoFil}
          onChange={(e) => setEstado(e.target.value)}
          className="h-8 rounded-md border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PAGADA">Pagada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => exportCSV(filtered)}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        >
          <Download size={12} />
          Exportar CSV
        </button>
      </div>

      {/* Totales */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span><span className="font-semibold text-text-primary">{filtered.length}</span> facturas</span>
        <span>Pagado: <span className="font-semibold text-status-ok">${fmt(totales.pagado)}</span></span>
        <span>Pendiente: <span className="font-semibold text-status-warn">${fmt(totales.pendiente)}</span></span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Fecha</th>
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Proveedor</th>
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Orden / Sucursal</th>
              <th className="px-4 py-2.5 text-left font-medium text-text-tertiary">Técnico</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-tertiary">Monto</th>
              <th className="px-4 py-2.5 text-center font-medium text-text-tertiary">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const meta = ESTADO_META[f.estado];
              const Icon = meta.icon;
              return (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors">
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {format(new Date(f.fechaEmision), "d MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary truncate max-w-[160px]">{f.proveedor}</div>
                    {f.rfcEmisor && <div className="text-[10px] font-mono text-text-tertiary">{f.rfcEmisor}</div>}
                    {f.concepto && <div className="text-[10px] text-text-tertiary truncate max-w-[160px]">{f.concepto}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{f.orden.numero}</div>
                    <div className="text-[10px] text-text-tertiary truncate max-w-[120px]">{f.orden.equipo.sucursal.nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {f.tecnico ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-light text-[9px] font-semibold text-brand-blue">
                          {f.tecnico.iniciales}
                        </span>
                        <span className="truncate max-w-[80px]">{f.tecnico.nombre}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">
                    ${Number(f.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold", meta.cls)}>
                      <Icon size={8} />
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-tertiary">Sin facturas que coincidan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KPI box ────────────────────────────────────────────────────────

function KpiBox({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-primary p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</div>
          <div className="mt-1.5 text-lg font-semibold text-text-primary">{value}</div>
          {sub && <div className="mt-0.5 text-[10px] text-text-tertiary">{sub}</div>}
        </div>
        <div className={cn("mt-0.5", color)}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
