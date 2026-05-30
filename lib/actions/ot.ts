"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoOT, TipoOT, Prioridad, EstadoEquipo, EstadoIncidencia } from "@prisma/client";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function transitionOT(
  otId: string,
  nextEstado: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const now = new Date();
  try {
    const ot = await db.ordenTrabajo.findUnique({
      where:  { id: otId },
      select: {
        equipoId:      true,
        costoEstimado: true,
        facturas:      {
          where:  { estado: { not: "CANCELADA" } },
          select: { monto: true },
        },
      },
    });

    if (!ot) return { ok: false, error: "OT no encontrada" };

    if (nextEstado === "CERRADA") {
      if (ot.costoEstimado === null)
        return { ok: false, error: "Registra un presupuesto estimado antes de cerrar la OT" };
      if (ot.facturas.length === 0)
        return { ok: false, error: "Agrega al menos una factura antes de cerrar la OT" };
    }

    const costoReal =
      nextEstado === "CERRADA"
        ? ot.facturas.reduce((sum, f) => sum + Number(f.monto), 0)
        : undefined;

    await db.ordenTrabajo.update({
      where: { id: otId },
      data: {
        estado: nextEstado as EstadoOT,
        ...(nextEstado === "EN_PROCESO" && { iniciada: now }),
        ...(nextEstado === "CERRADA"    && { cerrada: now, costo: costoReal }),
      },
    });

    // When OT closes: auto-close the linked incidencia, then restore equipo if clear
    if (nextEstado === "CERRADA") {
      await db.incidencia.updateMany({
        where: {
          equipoId: ot.equipoId,
          estado:   { in: [EstadoIncidencia.EVALUACION, EstadoIncidencia.EN_ATENCION] },
        },
        data: { estado: EstadoIncidencia.CERRADA },
      });

      const incActivas = await db.incidencia.count({
        where: {
          equipoId: ot.equipoId,
          estado:   { in: [EstadoIncidencia.EVALUACION, EstadoIncidencia.EN_ATENCION] },
        },
      });
      if (incActivas === 0) {
        await db.equipo.updateMany({
          where: { id: ot.equipoId, estado: EstadoEquipo.MANTENIMIENTO },
          data:  { estado: EstadoEquipo.OPERATIVO },
        });
      }
    }

    revalidatePath("/ordenes");
    revalidatePath("/incidencias");
    revalidatePath("/equipos");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar la OT" };
  }
}

export async function agregarEvidenciaOT(
  otId: string,
  urls: string[]
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.ordenTrabajo.update({
      where: { id: otId },
      data:  { evidencias: { push: urls } },
    });
    revalidatePath("/ordenes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al guardar evidencias" };
  }
}

export async function asignarTecnico(
  otId: string,
  tecnicoId: string | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.ordenTrabajo.update({
      where: { id: otId },
      data:  { tecnicoId: tecnicoId ?? null },
    });
    revalidatePath("/ordenes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al asignar técnico" };
  }
}

export async function agregarBitacora(
  ordenId: string,
  texto: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.bitacora.create({
      data: { ordenId, texto, autorId: session.user.id },
    });
    revalidatePath("/ordenes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al guardar la nota" };
  }
}

export async function crearOrdenTrabajo(input: {
  equipoId:    string;
  tipo:        string;
  prioridad:   string;
  titulo:      string;
  descripcion: string;
  tecnicoId:     string;
  fecha:         string;
  costoEstimado?: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const year = new Date().getFullYear();
    const last = await db.ordenTrabajo.findFirst({
      where:   { numero: { startsWith: `OT-${year}-` } },
      orderBy: { numero: "desc" },
      select:  { numero: true },
    });
    const seq    = last
      ? String(Number(last.numero.split("-")[2]) + 1).padStart(4, "0")
      : "0001";
    const numero = `OT-${year}-${seq}`;

    await db.ordenTrabajo.create({
      data: {
        numero,
        equipoId:    input.equipoId,
        tipo:        input.tipo      as TipoOT,
        prioridad:   input.prioridad as Prioridad,
        titulo:      input.titulo,
        descripcion: input.descripcion || null,
        tecnicoId:   input.tecnicoId   || null,
        creadorId:   session.user.id,
        programada:  new Date(input.fecha),
        costoEstimado: input.costoEstimado ?? null,
        estado:        "PROGRAMADA",
        evidencias:    [],
      },
    });
    revalidatePath("/ordenes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear la OT" };
  }
}
