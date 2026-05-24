"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoFactura } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { XMLParser } from "fast-xml-parser";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── CFDI parser ────────────────────────────────────────────────

export type CfdiData = {
  uuid:         string | null;
  rfcEmisor:    string | null;
  nombreEmisor: string | null;
  proveedor:    string | null;
  concepto:     string | null;
  monto:        number;
  subtotal:     number;
  iva:          number;
  fechaEmision: string; // ISO string
};

export async function parsearCFDI(
  xmlString: string
): Promise<ActionResult<CfdiData>> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true,
    });
    const doc = parser.parse(xmlString);

    const comp =
      doc?.["Comprobante"] ??
      doc?.["cfdi:Comprobante"] ??
      Object.values(doc ?? {})[0];

    if (!comp) return { ok: false, error: "XML inválido: no se encontró Comprobante" };

    const emisor   = comp["Emisor"]   ?? comp["cfdi:Emisor"]   ?? {};
    const conceptos = comp["Conceptos"] ?? comp["cfdi:Conceptos"] ?? {};
    const complemento = comp["Complemento"] ?? comp["cfdi:Complemento"] ?? {};
    const timbre =
      complemento["TimbreFiscalDigital"] ??
      complemento["tfd:TimbreFiscalDigital"] ??
      {};

    const primerConcepto = (() => {
      const c = conceptos["Concepto"] ?? conceptos["cfdi:Concepto"];
      return Array.isArray(c) ? c[0] : c ?? {};
    })();

    const impuestos = comp["Impuestos"] ?? comp["cfdi:Impuestos"] ?? {};
    const totalIVA =
      Number(impuestos["@_TotalImpuestosTrasladados"] ?? 0) ||
      Number(comp["@_Total"] ?? 0) - Number(comp["@_SubTotal"] ?? 0);

    return {
      ok: true,
      data: {
        uuid:         timbre["@_UUID"]           ?? null,
        rfcEmisor:    emisor["@_Rfc"]            ?? null,
        nombreEmisor: emisor["@_Nombre"]         ?? null,
        proveedor:    emisor["@_Nombre"]         ?? null,
        concepto:     primerConcepto["@_Descripcion"] ?? null,
        monto:        Number(comp["@_Total"]     ?? 0),
        subtotal:     Number(comp["@_SubTotal"]  ?? 0),
        iva:          totalIVA,
        fechaEmision: comp["@_Fecha"]            ?? new Date().toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: "Error al parsear el XML: " + String(e) };
  }
}

// ── CRUD Facturas ──────────────────────────────────────────────

type FacturaInput = {
  ordenId:      string;
  tecnicoId?:   string | null;
  numero:       string;
  uuid?:        string | null;
  rfcEmisor?:   string | null;
  nombreEmisor?:string | null;
  proveedor:    string;
  monto:        number;
  subtotal?:    number | null;
  iva?:         number | null;
  fechaEmision: string;
  urlXml?:      string | null;
  concepto?:    string | null;
};

export async function crearFactura(
  input: FacturaInput
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const factura = await db.factura.create({
      data: {
        ordenId:      input.ordenId,
        tecnicoId:    input.tecnicoId    ?? null,
        numero:       input.numero,
        uuid:         input.uuid         ?? null,
        rfcEmisor:    input.rfcEmisor    ?? null,
        nombreEmisor: input.nombreEmisor ?? null,
        proveedor:    input.proveedor,
        monto:        input.monto,
        subtotal:     input.subtotal     ?? null,
        iva:          input.iva          ?? null,
        fechaEmision: new Date(input.fechaEmision),
        urlXml:       input.urlXml       ?? null,
        concepto:     input.concepto     ?? null,
        estado:       "PENDIENTE",
      },
    });
    revalidatePath("/ordenes");
    revalidatePath("/presupuestos");
    return { ok: true, data: { id: factura.id } };
  } catch {
    return { ok: false, error: "Error al crear la factura" };
  }
}

export async function marcarFacturaPagada(
  facturaId: string,
  fechaPago: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.factura.update({
      where: { id: facturaId },
      data:  { estado: "PAGADA", fechaPago: new Date(fechaPago) },
    });
    revalidatePath("/ordenes");
    revalidatePath("/presupuestos");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al marcar la factura como pagada" };
  }
}

export async function cancelarFactura(
  facturaId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.factura.update({
      where: { id: facturaId },
      data:  { estado: "CANCELADA" },
    });
    revalidatePath("/ordenes");
    revalidatePath("/presupuestos");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al cancelar la factura" };
  }
}

export async function setCostosOT(
  otId: string,
  costoEstimado: number | null,
  costo: number | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.ordenTrabajo.update({
      where: { id: otId },
      data:  { costoEstimado: costoEstimado ?? null, costo: costo ?? null },
    });
    revalidatePath("/ordenes");
    revalidatePath("/presupuestos");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al actualizar los costos" };
  }
}

export async function setPresupuestoSucursal(
  sucursalId: string,
  periodo: string,
  monto: number
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.presupuestoSucursal.upsert({
      where:  { sucursalId_periodo: { sucursalId, periodo } },
      update: { monto },
      create: { sucursalId, periodo, monto },
    });
    revalidatePath("/presupuestos");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al guardar el presupuesto" };
  }
}
