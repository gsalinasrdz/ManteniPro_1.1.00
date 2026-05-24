"use client";

import { useState, useRef, useTransition } from "react";
import { Receipt, Upload, Plus, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parsearCFDI, crearFactura, marcarFacturaPagada, cancelarFactura } from "@/lib/actions/factura";
import type { CfdiData } from "@/lib/actions/factura";

export type FacturaEntry = {
  id:           string;
  numero:       string;
  uuid:         string | null;
  proveedor:    string;
  nombreEmisor: string | null;
  rfcEmisor:    string | null;
  monto:        number;
  subtotal:     number | null;
  iva:          number | null;
  fechaEmision: Date;
  fechaPago:    Date | null;
  estado:       "PENDIENTE" | "PAGADA" | "CANCELADA";
  concepto:     string | null;
};

const ESTADO_META: Record<FacturaEntry["estado"], { label: string; icon: React.ElementType; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  icon: Clock,         cls: "bg-status-warn-bg text-status-warn" },
  PAGADA:     { label: "Pagada",     icon: CheckCircle2,  cls: "bg-status-ok-bg text-status-ok" },
  CANCELADA:  { label: "Cancelada",  icon: XCircle,       cls: "bg-bg-tertiary text-text-tertiary" },
};

// ── Form para nueva factura ────────────────────────────────────

type FormState = {
  numero:       string;
  proveedor:    string;
  rfcEmisor:    string;
  concepto:     string;
  monto:        string;
  subtotal:     string;
  iva:          string;
  fechaEmision: string;
  uuid:         string;
  urlXml:       string;
};

const EMPTY_FORM: FormState = {
  numero: "", proveedor: "", rfcEmisor: "", concepto: "",
  monto: "", subtotal: "", iva: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  uuid: "", urlXml: "",
};

function fromCfdi(data: CfdiData): Partial<FormState> {
  return {
    proveedor:    data.proveedor    ?? "",
    rfcEmisor:    data.rfcEmisor    ?? "",
    concepto:     data.concepto     ?? "",
    monto:        data.monto.toString(),
    subtotal:     data.subtotal.toString(),
    iva:          data.iva.toString(),
    fechaEmision: data.fechaEmision.slice(0, 10),
    uuid:         data.uuid         ?? "",
  };
}

interface FacturaSectionProps {
  otId:     string;
  tecnicoId?: string | null;
  facturas: FacturaEntry[];
  onAdded:  (f: FacturaEntry) => void;
  onUpdated:(id: string, changes: Partial<FacturaEntry>) => void;
}

export function FacturasSection({ otId, tecnicoId, facturas, onAdded, onUpdated }: FacturaSectionProps) {
  const fileRef          = useRef<HTMLInputElement>(null);
  const [form, setForm]  = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [parsing, setParsing]   = useState(false);
  const [pending, start]        = useTransition();
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [fechaPagoInput, setFechaPagoInput] = useState(new Date().toISOString().slice(0, 10));

  async function handleXml(file: File) {
    setParsing(true);
    const text = await file.text();
    const res  = await parsearCFDI(text);
    setParsing(false);

    if (!res.ok) { toast.error("Error al parsear XML", { description: res.error }); return; }
    setForm((f) => ({ ...f, ...fromCfdi(res.data), urlXml: file.name }));
    setShowForm(true);
    toast.success("XML leído correctamente — verifica los datos");
  }

  function handleSubmit() {
    if (!form.proveedor || !form.monto || !form.fechaEmision) {
      toast.error("Proveedor, monto y fecha son obligatorios");
      return;
    }
    start(async () => {
      const res = await crearFactura({
        ordenId:      otId,
        tecnicoId:    tecnicoId ?? null,
        numero:       form.numero || `FAC-${Date.now()}`,
        uuid:         form.uuid     || null,
        rfcEmisor:    form.rfcEmisor || null,
        nombreEmisor: form.proveedor,
        proveedor:    form.proveedor,
        monto:        parseFloat(form.monto),
        subtotal:     form.subtotal  ? parseFloat(form.subtotal) : null,
        iva:          form.iva       ? parseFloat(form.iva)       : null,
        fechaEmision: form.fechaEmision,
        urlXml:       form.urlXml   || null,
        concepto:     form.concepto  || null,
      });
      if (!res.ok) { toast.error("Error", { description: res.error }); return; }

      onAdded({
        id:           res.data.id,
        numero:       form.numero || `FAC-${Date.now()}`,
        uuid:         form.uuid     || null,
        proveedor:    form.proveedor,
        nombreEmisor: form.proveedor,
        rfcEmisor:    form.rfcEmisor || null,
        monto:        parseFloat(form.monto),
        subtotal:     form.subtotal  ? parseFloat(form.subtotal) : null,
        iva:          form.iva       ? parseFloat(form.iva)      : null,
        fechaEmision: new Date(form.fechaEmision),
        fechaPago:    null,
        estado:       "PENDIENTE",
        concepto:     form.concepto || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Factura registrada");
    });
  }

  async function handleMarcarPagada(id: string) {
    const res = await marcarFacturaPagada(id, fechaPagoInput);
    if (!res.ok) { toast.error("Error", { description: res.error }); return; }
    onUpdated(id, { estado: "PAGADA", fechaPago: new Date(fechaPagoInput) });
    setPagandoId(null);
    toast.success("Factura marcada como pagada");
  }

  async function handleCancelar(id: string) {
    const res = await cancelarFactura(id);
    if (!res.ok) { toast.error("Error", { description: res.error }); return; }
    onUpdated(id, { estado: "CANCELADA" });
    toast.success("Factura cancelada");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
          Facturas {facturas.length > 0 && `(${facturas.length})`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium text-text-secondary hover:border-brand-blue/40 hover:bg-brand-blue-light hover:text-brand-blue disabled:opacity-50"
          >
            {parsing ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
            {parsing ? "Leyendo…" : "Subir XML"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex h-6 items-center gap-1 rounded-md border border-brand-blue px-2 text-[10px] font-medium text-brand-blue hover:bg-brand-blue-light"
          >
            <Plus size={10} />
            Manual
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleXml(e.target.files[0]); }}
      />

      {/* Lista de facturas */}
      {facturas.length === 0 && !showForm ? (
        <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-tertiary">
          <Receipt size={12} className="mr-1.5 opacity-50" />
          Sin facturas registradas
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {facturas.map((f) => {
            const meta = ESTADO_META[f.estado];
            const Icon = meta.icon;
            return (
              <div key={f.id} className="rounded-lg border border-border bg-bg-secondary p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary truncate">{f.proveedor}</span>
                      <span className={cn("rounded-full px-1.5 py-px text-[9px] font-semibold flex items-center gap-0.5", meta.cls)}>
                        <Icon size={8} />
                        {meta.label}
                      </span>
                    </div>
                    {f.concepto && (
                      <p className="mt-0.5 text-[10px] text-text-tertiary truncate">{f.concepto}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-text-tertiary">
                      <span>{format(new Date(f.fechaEmision), "d MMM yyyy", { locale: es })}</span>
                      {f.rfcEmisor && <span className="font-mono">{f.rfcEmisor}</span>}
                      {f.uuid && (
                        <span className="font-mono truncate max-w-[80px]" title={f.uuid}>
                          {f.uuid.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-text-primary">
                      ${Number(f.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    {f.iva && (
                      <div className="text-[10px] text-text-tertiary">
                        IVA ${Number(f.iva).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                {f.estado === "PENDIENTE" && (
                  <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                    {pagandoId === f.id ? (
                      <>
                        <input
                          type="date"
                          value={fechaPagoInput}
                          onChange={(e) => setFechaPagoInput(e.target.value)}
                          className="h-6 flex-1 rounded-md border border-border bg-bg-primary px-2 text-[10px] focus:border-brand-blue focus:outline-none"
                        />
                        <button
                          onClick={() => handleMarcarPagada(f.id)}
                          className="h-6 rounded-md bg-status-ok-mid px-2 text-[10px] font-medium text-white hover:opacity-90"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setPagandoId(null)}
                          className="h-6 rounded-md border border-border px-2 text-[10px] text-text-secondary hover:bg-bg-secondary"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setPagandoId(f.id)}
                          className="h-6 rounded-md bg-status-ok-mid px-2 text-[10px] font-medium text-white hover:opacity-90"
                        >
                          Marcar pagada
                        </button>
                        <button
                          onClick={() => handleCancelar(f.id)}
                          className="h-6 rounded-md border border-border px-2 text-[10px] text-text-secondary hover:bg-bg-secondary"
                        >
                          Cancelar factura
                        </button>
                      </>
                    )}
                  </div>
                )}
                {f.estado === "PAGADA" && f.fechaPago && (
                  <div className="mt-1.5 text-[10px] text-status-ok">
                    Pagada el {format(new Date(f.fechaPago), "d MMM yyyy", { locale: es })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form nueva factura */}
      {showForm && (
        <div className="rounded-lg border border-brand-blue/20 bg-bg-secondary p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Nueva factura</span>
            <button onClick={() => setShowForm(false)}>
              <ChevronUp size={14} className="text-text-tertiary" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Proveedor *",    key: "proveedor",    span: true },
              { label: "No. Factura",    key: "numero",       span: false },
              { label: "RFC Emisor",     key: "rfcEmisor",    span: false },
              { label: "Monto total *",  key: "monto",        span: false, type: "number" },
              { label: "Subtotal",       key: "subtotal",     span: false, type: "number" },
              { label: "IVA",            key: "iva",          span: false, type: "number" },
              { label: "Fecha emisión *",key: "fechaEmision", span: false, type: "date" },
              { label: "UUID CFDI",      key: "uuid",         span: true },
              { label: "Concepto",       key: "concepto",     span: true },
            ].map(({ label, key, span, type = "text" }) => (
              <div key={key} className={cn("flex flex-col gap-1", span && "col-span-2")}>
                <label className="text-[10px] text-text-tertiary">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof FormState]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="h-7 rounded-md border border-border bg-bg-primary px-2 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : null}
            Registrar factura
          </button>
        </div>
      )}
    </div>
  );
}
