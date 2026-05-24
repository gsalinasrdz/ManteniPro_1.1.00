"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  XCircle, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { procesarXMLInventario } from "@/lib/actions/inventario";
import type { XMLItem } from "@/lib/actions/inventario";

// ── Types ──────────────────────────────────────────────────────

type ConceptoXML = {
  noIdentificacion: string;
  descripcion:      string;
  cantidad:         number;
  valorUnitario:    number;
};

type MetaXML = {
  uuid:      string;
  proveedor: string;
  rfc:       string;
  fecha:     string;
};

type RefaccionExistente = {
  id: string; sku: string; nombre: string; stock: number;
};

type LineaPreview = ConceptoXML & {
  refaccionId:    string | null;
  refaccionNombre: string | null;
  stockActual:    number | null;
  estado:         "match" | "parcial" | "nuevo";
  incluir:        boolean;
  accion:         "actualizar" | "crear" | "omitir";
  categoriaInput: string;
  cantidadEdit:   number;
};

interface Props {
  open:        boolean;
  onClose:     () => void;
  refacciones: RefaccionExistente[];
  categorias:  string[];
}

// ── CFDI XML parser ────────────────────────────────────────────

function parseCFDI(xmlText: string): { meta: MetaXML; conceptos: ConceptoXML[] } | null {
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return null;

    const getEl = (tag: string) =>
      doc.querySelector(`[*|${tag}]`) ??
      doc.querySelector(tag) ??
      doc.getElementsByTagName(tag)[0] ??
      null;

    // Try multiple namespace patterns for CFDI 3.3 and 4.0
    const emisor = getEl("Emisor");
    const timbre  = getEl("TimbreFiscalDigital");
    const comprobante = doc.documentElement;

    const meta: MetaXML = {
      uuid:      timbre?.getAttribute("UUID")             ?? "",
      proveedor: emisor?.getAttribute("Nombre")           ?? "",
      rfc:       emisor?.getAttribute("Rfc")              ?? "",
      fecha:     comprobante?.getAttribute("Fecha")       ?? comprobante?.getAttribute("fecha") ?? "",
    };

    const conceptoEls = Array.from(
      doc.querySelectorAll("Concepto") .length > 0
        ? doc.querySelectorAll("Concepto")
        : doc.getElementsByTagName("cfdi:Concepto")
    );

    const conceptos: ConceptoXML[] = conceptoEls.map((c) => ({
      noIdentificacion: c.getAttribute("NoIdentificacion") ?? "",
      descripcion:      c.getAttribute("Descripcion")      ?? "",
      cantidad:         parseFloat(c.getAttribute("Cantidad")       ?? "0"),
      valorUnitario:    parseFloat(c.getAttribute("ValorUnitario")  ?? "0"),
    })).filter((c) => c.cantidad > 0);

    if (!conceptos.length) return null;
    return { meta, conceptos };
  } catch {
    return null;
  }
}

function matchRefaccion(
  concepto: ConceptoXML,
  refacciones: RefaccionExistente[]
): { ref: RefaccionExistente; tipo: "match" | "parcial" } | null {
  // Exact SKU match
  if (concepto.noIdentificacion) {
    const exact = refacciones.find(
      (r) => r.sku.toUpperCase() === concepto.noIdentificacion.toUpperCase()
    );
    if (exact) return { ref: exact, tipo: "match" };
  }
  // Partial description match (≥60% words overlap)
  const palabras = concepto.descripcion.toLowerCase().split(/\s+/).filter(Boolean);
  let bestScore = 0;
  let bestRef: RefaccionExistente | null = null;
  for (const r of refacciones) {
    const nombrePalab = r.nombre.toLowerCase().split(/\s+/);
    const match = palabras.filter((p) => nombrePalab.some((n) => n.includes(p) || p.includes(n))).length;
    const score = palabras.length > 0 ? match / palabras.length : 0;
    if (score > bestScore) { bestScore = score; bestRef = r; }
  }
  if (bestScore >= 0.6 && bestRef) return { ref: bestRef, tipo: "parcial" };
  return null;
}

// ── Step 1: File upload ────────────────────────────────────────

function StepUpload({ onParsed }: { onParsed: (meta: MetaXML, conceptos: ConceptoXML[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState("");

  function handleFile(file: File) {
    setError("");
    if (!file.name.endsWith(".xml")) { setError("Solo se aceptan archivos .xml"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCFDI(text);
      if (!result) { setError("El archivo no es un CFDI válido o no tiene conceptos"); return; }
      onParsed(result.meta, result.conceptos);
    };
    reader.readAsText(file, "utf-8");
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-text-secondary">
        Carga una factura en formato <strong>CFDI XML</strong> (SAT México). El sistema empatará automáticamente los conceptos con el inventario existente por SKU.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
          dragging ? "border-brand-blue bg-brand-blue-light" : "border-border hover:border-brand-blue/40 hover:bg-bg-secondary"
        )}
      >
        <Upload size={28} className="text-text-tertiary" />
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">Arrastra tu XML aquí</p>
          <p className="mt-0.5 text-xs text-text-tertiary">o haz click para seleccionar</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-status-danger">
          <XCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ── Step 2: Preview ────────────────────────────────────────────

const ESTADO_ICON = {
  match:   <CheckCircle2 size={13} className="shrink-0 text-status-ok" />,
  parcial: <AlertTriangle size={13} className="shrink-0 text-status-warn" />,
  nuevo:   <XCircle size={13} className="shrink-0 text-text-tertiary" />,
};
const ESTADO_LABEL = {
  match:   "Match exacto (SKU)",
  parcial: "Match parcial (descripción)",
  nuevo:   "Sin match — crear nueva",
};

function StepPreview({
  meta, lineas, categorias, onChange,
}: {
  meta:       MetaXML;
  lineas:     LineaPreview[];
  categorias: string[];
  onChange:   (idx: number, patch: Partial<LineaPreview>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Metadata */}
      <div className="rounded-lg border border-border bg-bg-secondary px-4 py-3 text-xs">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-text-tertiary">Proveedor: <span className="font-medium text-text-primary">{meta.proveedor || "—"}</span></span>
          <span className="text-text-tertiary">RFC: <span className="font-mono text-text-primary">{meta.rfc || "—"}</span></span>
          {meta.fecha && <span className="text-text-tertiary">Fecha: <span className="text-text-primary">{meta.fecha.slice(0, 10)}</span></span>}
          {meta.uuid && <span className="text-text-tertiary font-mono">{meta.uuid.slice(0, 18)}…</span>}
        </div>
      </div>

      {/* Lines */}
      <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-0.5">
        {lineas.map((l, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              !l.incluir ? "border-border opacity-50" :
              l.estado === "match"   ? "border-status-ok/30 bg-status-ok-bg/30" :
              l.estado === "parcial" ? "border-status-warn/30 bg-status-warn-bg/30" :
                                       "border-border bg-bg-secondary"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={l.incluir}
                onChange={(e) => onChange(i, { incluir: e.target.checked, accion: e.target.checked ? (l.refaccionId ? "actualizar" : "crear") : "omitir" })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {ESTADO_ICON[l.estado]}
                  <span className="text-[10px] text-text-tertiary">{ESTADO_LABEL[l.estado]}</span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-text-primary leading-snug">
                  {l.descripcion}
                </p>
                {l.noIdentificacion && (
                  <p className="font-mono text-[10px] text-text-tertiary">{l.noIdentificacion}</p>
                )}

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {/* Cantidad editable */}
                  <div>
                    <label className="text-[10px] text-text-tertiary">Cantidad</label>
                    <input
                      type="number" min={1}
                      value={l.cantidadEdit}
                      disabled={!l.incluir}
                      onChange={(e) => onChange(i, { cantidadEdit: parseInt(e.target.value, 10) || 1 })}
                      className="mt-0.5 h-7 w-full rounded border border-border bg-bg-primary px-2 text-xs tabular-nums focus:border-brand-blue focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  {/* Costo */}
                  <div>
                    <label className="text-[10px] text-text-tertiary">Costo unit.</label>
                    <p className="mt-0.5 h-7 flex items-center text-xs tabular-nums text-text-secondary">
                      ${l.valorUnitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {/* Stock resultado */}
                  {l.stockActual !== null && (
                    <div>
                      <label className="text-[10px] text-text-tertiary">Stock → nuevo</label>
                      <p className="mt-0.5 h-7 flex items-center gap-1 text-xs">
                        <span className="tabular-nums text-text-secondary">{l.stockActual}</span>
                        <ChevronRight size={10} className="text-text-tertiary" />
                        <span className="font-medium tabular-nums text-status-ok">{l.stockActual + l.cantidadEdit}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Categoría (solo en crear) */}
                {l.estado === "nuevo" && l.incluir && (
                  <div className="mt-2">
                    <label className="text-[10px] text-text-tertiary">Categoría</label>
                    <select
                      value={l.categoriaInput}
                      onChange={(e) => onChange(i, { categoriaInput: e.target.value })}
                      className="mt-0.5 h-7 w-full rounded border border-border bg-bg-primary px-2 text-xs focus:border-brand-blue focus:outline-none"
                    >
                      <option value="">Sin categoría (General)</option>
                      {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Refacción que se empatará */}
                {l.refaccionNombre && (
                  <p className="mt-1.5 text-[10px] text-text-tertiary">
                    → {l.refaccionNombre} <span className="font-mono">({l.noIdentificacion || "desc"})</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-text-tertiary">
        {lineas.filter((l) => l.incluir && l.accion === "actualizar").length} a actualizar ·{" "}
        {lineas.filter((l) => l.incluir && l.accion === "crear").length} a crear ·{" "}
        {lineas.filter((l) => !l.incluir || l.accion === "omitir").length} omitidas
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────

export function XmlImportModal({ open, onClose, refacciones, categorias }: Props) {
  const router = useRouter();
  const [step, setStep]     = useState<1 | 2>(1);
  const [meta, setMeta]     = useState<MetaXML | null>(null);
  const [lineas, setLineas] = useState<LineaPreview[]>([]);
  const [pending, start]    = useTransition();

  function handleClose() {
    onClose();
    setTimeout(() => { setStep(1); setMeta(null); setLineas([]); }, 200);
  }

  function handleParsed(m: MetaXML, conceptos: ConceptoXML[]) {
    setMeta(m);
    const ls: LineaPreview[] = conceptos.map((c) => {
      const found = matchRefaccion(c, refacciones);
      const estado: LineaPreview["estado"] = found
        ? found.tipo : "nuevo";
      return {
        ...c,
        refaccionId:     found?.ref.id    ?? null,
        refaccionNombre: found?.ref.nombre ?? null,
        stockActual:     found?.ref.stock  ?? null,
        estado,
        incluir:         true,
        accion:          found ? "actualizar" : "crear",
        categoriaInput:  "",
        cantidadEdit:    c.cantidad,
      };
    });
    setLineas(ls);
    setStep(2);
  }

  function patchLinea(idx: number, patch: Partial<LineaPreview>) {
    setLineas((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function handleAplicar() {
    const items: XMLItem[] = lineas.map((l) => ({
      refaccionId:   l.refaccionId,
      sku:           l.noIdentificacion,
      nombre:        l.descripcion,
      categoria:     l.categoriaInput || "General",
      cantidad:      l.cantidadEdit,
      valorUnitario: l.valorUnitario,
      accion:        l.incluir ? l.accion : "omitir",
    }));

    start(async () => {
      const res = await procesarXMLInventario(items);
      if (!res.ok) { toast.error("Error", { description: res.error }); return; }
      toast.success("Inventario actualizado", {
        description: `${res.actualizadas} artículos actualizados · ${res.creadas} creados`,
      });
      handleClose();
      router.refresh();
    });
  }

  const hayAcciones = lineas.some((l) => l.incluir && l.accion !== "omitir");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl bg-bg-primary" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <FileText size={16} className="text-brand-blue" />
              Importar factura XML (CFDI)
            </DialogTitle>
            <span className="text-xs text-text-tertiary">
              Paso {step} de 2 · {step === 1 ? "Cargar archivo" : "Vista previa"}
            </span>
          </div>
          <div className="flex gap-1 pt-0.5">
            <div className="h-0.5 flex-1 rounded-full bg-brand-blue" />
            <div className={cn("h-0.5 flex-1 rounded-full transition-colors", step === 2 ? "bg-brand-blue" : "bg-border")} />
          </div>
        </DialogHeader>

        {step === 1 ? (
          <StepUpload onParsed={handleParsed} />
        ) : (
          meta && (
            <StepPreview
              meta={meta}
              lineas={lineas}
              categorias={categorias}
              onChange={patchLinea}
            />
          )
        )}

        <div className="-mx-4 -mb-4 flex items-center justify-between rounded-b-xl border-t border-border bg-bg-secondary px-4 py-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              ← Volver
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

          {step === 2 && (
            <Button
              size="sm"
              disabled={!hayAcciones || pending}
              onClick={handleAplicar}
            >
              {pending
                ? <><Loader2 size={13} className="animate-spin mr-1.5" />Aplicando…</>
                : "Aplicar importación"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
