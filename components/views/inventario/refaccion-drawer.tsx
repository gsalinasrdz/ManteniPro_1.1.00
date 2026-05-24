"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X, Package, MapPin, DollarSign, BarChart3,
  AlertTriangle, Clock, CheckCircle2, Loader2,
  ClipboardList, Trash2, PenLine, MinusCircle, PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import { toast } from "sonner";
import { ajustarStock, eliminarRefaccion, getRefaccionHistorial } from "@/lib/actions/inventario";
import type { RefaccionUsadaEntry } from "@/lib/actions/inventario";
import type { RefaccionRow } from "./refaccion-modal";
import { RefaccionModal } from "./refaccion-modal";

// ── Types ──────────────────────────────────────────────────────

interface DrawerProps {
  refaccion:  RefaccionRow | null;
  categorias: string[];
  onClose:    () => void;
}

// ── Nivel de stock ─────────────────────────────────────────────

function nivelStock(r: RefaccionRow): "ok" | "porPedir" | "bajo" | "agotado" {
  if (r.stock === 0)               return "agotado";
  if (r.stock < r.min)             return "bajo";
  if (r.stock <= r.puntoReorden)   return "porPedir";
  return "ok";
}

const NIVEL_TONE: Record<string, "ok" | "warn" | "danger" | "gray"> = {
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

// ── Stock bar con 3 zonas ──────────────────────────────────────

function StockZoneBar({ r }: { r: RefaccionRow }) {
  const max = r.max || Math.max(r.stock, r.puntoReorden, r.min, 1) * 2;
  const pctStock   = Math.min((r.stock / max) * 100, 100);
  const pctMin     = Math.min((r.min / max) * 100, 100);
  const pctReorden = Math.min((r.puntoReorden / max) * 100, 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-3 overflow-hidden rounded-full bg-bg-tertiary">
        {/* Zone colors */}
        <div className="absolute inset-y-0 left-0 rounded-full bg-status-danger-mid opacity-25"
          style={{ width: `${pctMin}%` }} />
        <div className="absolute inset-y-0 rounded-full bg-status-warn-mid opacity-25"
          style={{ left: `${pctMin}%`, width: `${pctReorden - pctMin}%` }} />
        <div className="absolute inset-y-0 right-0 rounded-full bg-status-ok opacity-20"
          style={{ left: `${pctReorden}%` }} />
        {/* Actual stock fill */}
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all",
            r.stock === 0       ? "bg-status-danger-mid" :
            r.stock < r.min     ? "bg-status-danger-mid" :
            r.stock <= r.puntoReorden ? "bg-status-warn-mid" :
                                  "bg-status-ok"
          )}
          style={{ width: `${pctStock}%` }}
        />
        {/* Tick marks */}
        {r.min > 0 && (
          <div className="absolute inset-y-0 w-px bg-status-danger/60"
            style={{ left: `${pctMin}%` }} />
        )}
        {r.puntoReorden > 0 && (
          <div className="absolute inset-y-0 w-px bg-status-warn/60"
            style={{ left: `${pctReorden}%` }} />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-tertiary">
        <span>0</span>
        <span className="text-status-danger">Mín {r.min}</span>
        <span className="text-status-warn">Reorden {r.puntoReorden}</span>
        <span>Máx {max}</span>
      </div>
    </div>
  );
}

// ── Historial tab ──────────────────────────────────────────────

function HistorialTab({ refaccionId }: { refaccionId: string }) {
  const [historial, setHistorial] = useState<RefaccionUsadaEntry[] | null>(null);
  const [pending, start]          = useTransition();

  useEffect(() => {
    start(async () => {
      const res = await getRefaccionHistorial(refaccionId);
      if (res.ok) setHistorial(res.data);
    });
  }, [refaccionId]);

  if (pending || historial === null) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 size={18} className="animate-spin text-text-tertiary" />
      </div>
    );
  }
  if (historial.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-text-tertiary">
        <ClipboardList size={22} className="opacity-40" />
        <p className="text-xs">Sin uso en órdenes de trabajo</p>
      </div>
    );
  }

  const totalUsado = historial.reduce((s, e) => s + e.cantidad, 0);
  const costoTotal = historial.reduce((s, e) => s + e.cantidad * e.costoUnitario, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Total usado</div>
          <div className="mt-0.5 text-sm font-semibold text-text-primary">{totalUsado} pzas</div>
        </div>
        <div className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Costo total</div>
          <div className="mt-0.5 text-sm font-semibold text-text-primary">
            ${costoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      {historial.map((e) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <ClipboardList size={12} className="text-brand-blue" />
            </div>
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="mb-3 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-text-tertiary">{e.orden.numero}</span>
              <span className="rounded-full bg-bg-tertiary px-1.5 py-px text-[9px] font-semibold text-text-secondary">
                {e.cantidad} pzas
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-text-primary">
              {e.orden.titulo}
            </p>
            <div className="mt-1 text-[10px] text-text-tertiary">
              {format(new Date(e.orden.programada), "d MMM yyyy", { locale: es })}
              {" · "}${(e.cantidad * e.costoUnitario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────

export function RefaccionDrawer({ refaccion, categorias, onClose }: DrawerProps) {
  const router = useRouter();
  const isOpen = Boolean(refaccion);

  const [tab, setTab]           = useState<"info" | "historial">("info");
  const [modalEdit, setModalEdit] = useState(false);
  const [ajuste, setAjuste]     = useState("");
  const [ajustando, startAjuste] = useTransition();
  const [eliminando, startElim]  = useTransition();
  const [confirmElim, setConfirmElim] = useState(false);

  useEffect(() => {
    setTab("info");
    setAjuste("");
    setConfirmElim(false);
  }, [refaccion?.id]);

  const nivel = refaccion ? nivelStock(refaccion) : "ok";

  function handleAjuste(sign: 1 | -1) {
    if (!refaccion) return;
    const delta = parseInt(ajuste, 10);
    if (!delta || delta <= 0) { toast.error("Ingresa una cantidad válida"); return; }
    startAjuste(async () => {
      const res = await ajustarStock(refaccion.id, sign * delta);
      if (!res.ok) { toast.error("Error", { description: res.error }); return; }
      toast.success(`Stock ${sign > 0 ? "aumentado" : "reducido"} en ${delta} pzas`);
      setAjuste("");
      router.refresh();
    });
  }

  function handleEliminar() {
    if (!refaccion) return;
    startElim(async () => {
      const res = await eliminarRefaccion(refaccion.id);
      if (!res.ok) { toast.error("Error", { description: res.error }); setConfirmElim(false); return; }
      toast.success("Refacción eliminada");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/20 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 z-40 flex h-screen w-[440px] flex-col border-l border-border bg-bg-primary shadow-xl transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {refaccion && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <div className="font-mono text-xs text-text-tertiary">{refaccion.sku}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
                  {refaccion.nombre}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">{refaccion.categoria}</div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["info", "historial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors",
                    tab === t
                      ? "border-b-2 border-brand-blue text-brand-blue"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "info" ? "Información" : "Historial de uso"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
              {tab === "historial" ? (
                <HistorialTab refaccionId={refaccion.id} />
              ) : (
                <>
                  {/* Estado + stock */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={NIVEL_TONE[nivel]} dot={nivel !== "ok"}>
                        {NIVEL_LABEL[nivel]}
                      </Badge>
                      <span className="text-2xl font-semibold text-text-primary tabular-nums">
                        {refaccion.stock}
                      </span>
                      <span className="text-sm text-text-tertiary">pzas</span>
                    </div>
                    <StockZoneBar r={refaccion} />
                  </div>

                  {/* Por pedir banner */}
                  {nivel === "porPedir" && (
                    <div className="flex items-start gap-2 rounded-lg border border-status-warn/30 bg-status-warn-bg px-3 py-2">
                      <Clock size={13} className="mt-0.5 shrink-0 text-status-warn" />
                      <p className="text-xs text-status-warn">
                        Stock en punto de reorden — generar orden de compra al proveedor
                      </p>
                    </div>
                  )}

                  {/* Detail rows */}
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-secondary p-4">
                    <Row icon={Package} label="Ubicación">
                      {refaccion.ubicacion ?? <span className="text-text-tertiary">Sin asignar</span>}
                    </Row>
                    <Row icon={DollarSign} label="Costo unitario">
                      ${refaccion.costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </Row>
                    <Row icon={BarChart3} label="Valor en stock">
                      <span className="font-medium">
                        ${(refaccion.stock * refaccion.costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </Row>
                    <Row icon={CheckCircle2} label="Umbrales">
                      <span className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="text-status-danger">Mín {refaccion.min}</span>
                        <span className="text-status-warn">Reorden {refaccion.puntoReorden}</span>
                        <span className="text-text-tertiary">Máx {refaccion.max}</span>
                      </span>
                    </Row>
                  </div>

                  {/* Ajustar stock */}
                  <div className="rounded-xl border border-border bg-bg-secondary p-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                      Ajuste de stock
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={ajuste}
                        onChange={(e) => setAjuste(e.target.value)}
                        placeholder="Cantidad"
                        className="h-8 w-24 rounded-lg border border-border bg-bg-primary px-2.5 text-sm text-text-primary tabular-nums focus:border-brand-blue focus:outline-none"
                      />
                      <button
                        onClick={() => handleAjuste(1)}
                        disabled={ajustando}
                        className="flex h-8 items-center gap-1 rounded-lg border border-status-ok/40 bg-status-ok-bg px-3 text-xs font-medium text-status-ok transition-colors hover:bg-status-ok/10 disabled:opacity-50"
                      >
                        <PlusCircle size={12} />
                        Entrada
                      </button>
                      <button
                        onClick={() => handleAjuste(-1)}
                        disabled={ajustando}
                        className="flex h-8 items-center gap-1 rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger/10 disabled:opacity-50"
                      >
                        <MinusCircle size={12} />
                        Salida
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
              <button
                onClick={() => setModalEdit(true)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
              >
                <PenLine size={13} />
                Editar refacción
              </button>

              {/* Delete — solo si stock=0 y sin usos */}
              {refaccion.stock === 0 && (
                confirmElim ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEliminar}
                      disabled={eliminando}
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-status-danger px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {eliminando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Confirmar eliminación
                    </button>
                    <button
                      onClick={() => setConfirmElim(false)}
                      className="h-9 rounded-lg border border-border px-3 text-sm text-text-secondary hover:bg-bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmElim(true)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 text-sm font-medium text-status-danger hover:bg-status-danger/10"
                  >
                    <Trash2 size={13} />
                    Eliminar refacción
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      <RefaccionModal
        open={modalEdit}
        onClose={() => setModalEdit(false)}
        refaccion={refaccion ?? undefined}
        categorias={categorias}
      />
    </>
  );
}

// ── Detail row helper ──────────────────────────────────────────

function Row({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-tertiary">
        <Icon size={12} className="text-text-tertiary" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</div>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  );
}
