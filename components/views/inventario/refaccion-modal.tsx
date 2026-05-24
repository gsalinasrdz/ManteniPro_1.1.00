"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crearRefaccion, editarRefaccion } from "@/lib/actions/inventario";

// ── Types ──────────────────────────────────────────────────────

export type RefaccionRow = {
  id: string; sku: string; nombre: string; categoria: string;
  stock: number; min: number; puntoReorden: number; max: number;
  costo: number; ubicacion: string | null;
};

interface RefaccionModalProps {
  open:       boolean;
  onClose:    () => void;
  refaccion?: RefaccionRow;
  categorias: string[];
}

type Form = {
  sku: string; nombre: string; categoria: string;
  stock: string; min: string; puntoReorden: string; max: string;
  costo: string; ubicacion: string;
};

const EMPTY: Form = {
  sku: "", nombre: "", categoria: "", stock: "0",
  min: "0", puntoReorden: "0", max: "0", costo: "0", ubicacion: "",
};

// ── Field row ─────────────────────────────────────────────────

function Field({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-text-secondary">
        {label}{required && <span className="ml-0.5 text-status-danger">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────

export function RefaccionModal({
  open, onClose, refaccion, categorias,
}: RefaccionModalProps) {
  const router      = useRouter();
  const isEdit      = Boolean(refaccion);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, start] = useTransition();
  const [catInput, setCatInput] = useState(false);

  useEffect(() => {
    if (open) {
      if (refaccion) {
        setForm({
          sku:          refaccion.sku,
          nombre:       refaccion.nombre,
          categoria:    refaccion.categoria,
          stock:        String(refaccion.stock),
          min:          String(refaccion.min),
          puntoReorden: String(refaccion.puntoReorden),
          max:          String(refaccion.max),
          costo:        String(refaccion.costo),
          ubicacion:    refaccion.ubicacion ?? "",
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, refaccion]);

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function num(v: string) { return parseFloat(v) || 0; }
  function int(v: string) { return parseInt(v, 10) || 0; }

  const errors: string[] = [];
  if (!form.sku.trim())    errors.push("SKU requerido");
  if (!form.nombre.trim()) errors.push("Nombre requerido");
  if (!form.categoria.trim()) errors.push("Categoría requerida");
  if (num(form.costo) <= 0) errors.push("Costo debe ser mayor a 0");
  if (int(form.min) > int(form.puntoReorden)) errors.push("Mín ≤ Punto de reorden");
  if (int(form.puntoReorden) > int(form.max)) errors.push("Punto de reorden ≤ Máx");
  const canSubmit = errors.length === 0;

  function handleClose() {
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit || pending) return;
    start(async () => {
      const payload = {
        sku:          form.sku,
        nombre:       form.nombre,
        categoria:    form.categoria,
        min:          int(form.min),
        puntoReorden: int(form.puntoReorden),
        max:          int(form.max),
        costo:        num(form.costo),
        ubicacion:    form.ubicacion || undefined,
      };

      const result = isEdit && refaccion
        ? await editarRefaccion(refaccion.id, payload)
        : await crearRefaccion({ ...payload, stock: int(form.stock) });

      if (!result.ok) {
        toast.error("Error", { description: result.error });
        return;
      }
      toast.success(isEdit ? "Refacción actualizada" : "Refacción creada", {
        description: `${form.sku.toUpperCase()} — ${form.nombre}`,
      });
      handleClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg bg-bg-primary" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">
            {isEdit ? "Editar refacción" : "Nueva refacción"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* SKU + Nombre */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" required>
              <Input
                value={form.sku}
                onChange={(e) => patch({ sku: e.target.value })}
                placeholder="EJ-1234"
                className="h-8 font-mono text-sm uppercase"
              />
            </Field>
            <Field label="Nombre" required>
              <Input
                value={form.nombre}
                onChange={(e) => patch({ nombre: e.target.value })}
                placeholder="Filtro de aceite…"
                className="h-8 text-sm"
              />
            </Field>
          </div>

          {/* Categoría */}
          <Field label="Categoría" required>
            {catInput || !categorias.length ? (
              <Input
                value={form.categoria}
                onChange={(e) => patch({ categoria: e.target.value })}
                placeholder="Nueva categoría…"
                className="h-8 text-sm"
                autoFocus={catInput}
              />
            ) : (
              <div className="flex gap-2">
                <select
                  value={form.categoria}
                  onChange={(e) => {
                    if (e.target.value === "__nueva__") { setCatInput(true); patch({ categoria: "" }); }
                    else patch({ categoria: e.target.value });
                  }}
                  className="h-8 flex-1 rounded-lg border border-border bg-bg-primary px-2.5 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
                >
                  <option value="">Selecciona…</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__nueva__">+ Nueva categoría</option>
                </select>
              </div>
            )}
          </Field>

          {/* Stock inicial (solo en crear) */}
          {!isEdit && (
            <Field label="Stock inicial" required>
              <Input
                type="number" min={0}
                value={form.stock}
                onChange={(e) => patch({ stock: e.target.value })}
                className="h-8 text-sm"
              />
            </Field>
          )}

          {/* Umbrales: Mín / Pto. reorden / Máx */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Umbrales de stock
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary">Mínimo</span>
                <Input type="number" min={0} value={form.min}
                  onChange={(e) => patch({ min: e.target.value })}
                  className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-status-warn">Pto. reorden</span>
                <Input type="number" min={0} value={form.puntoReorden}
                  onChange={(e) => patch({ puntoReorden: e.target.value })}
                  className="h-8 border-status-warn/40 text-sm focus:border-status-warn" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary">Máximo</span>
                <Input type="number" min={0} value={form.max}
                  onChange={(e) => patch({ max: e.target.value })}
                  className="h-8 text-sm" />
              </div>
            </div>
            {/* Visual preview of thresholds */}
            {int(form.max) > 0 && (
              <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className="absolute inset-y-0 left-0 bg-status-danger-mid opacity-40"
                  style={{ width: `${Math.min((int(form.min) / int(form.max)) * 100, 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-status-warn-mid opacity-40"
                  style={{
                    left:  `${Math.min((int(form.min) / int(form.max)) * 100, 100)}%`,
                    width: `${Math.min(((int(form.puntoReorden) - int(form.min)) / int(form.max)) * 100, 100)}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-status-ok opacity-40"
                  style={{
                    left: `${Math.min((int(form.puntoReorden) / int(form.max)) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
            {errors.some((e) => e.includes("≤")) && (
              <p className="mt-1 text-[10px] text-status-danger">
                {errors.filter((e) => e.includes("≤")).join(" · ")}
              </p>
            )}
          </div>

          {/* Costo + Ubicación */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo unitario ($)" required>
              <Input
                type="number" min={0} step="0.01"
                value={form.costo}
                onChange={(e) => patch({ costo: e.target.value })}
                className="h-8 text-sm"
              />
            </Field>
            <Field label="Ubicación">
              <Input
                value={form.ubicacion}
                onChange={(e) => patch({ ubicacion: e.target.value })}
                placeholder="Almacén A / Estante 3…"
                className="h-8 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="-mx-4 -mb-4 flex items-center justify-between rounded-b-xl border-t border-border bg-bg-secondary px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </button>
          <Button
            size="sm"
            disabled={!canSubmit || pending}
            onClick={handleSubmit}
          >
            {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear refacción"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
