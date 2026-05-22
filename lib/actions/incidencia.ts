"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoIncidencia, Severidad } from "@prisma/client";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function transitionIncidencia(
  incId: string,
  nextEstado: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.incidencia.update({
      where: { id: incId },
      data:  { estado: nextEstado as EstadoIncidencia },
    });
    revalidatePath("/incidencias");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar la incidencia" };
  }
}

export async function generarOTDesdeIncidencia(
  incId: string
): Promise<ActionResult & { otNumero?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const inc = await db.incidencia.findUnique({
      where:  { id: incId },
      select: { equipoId: true, titulo: true, descripcion: true },
    });
    if (!inc) return { ok: false, error: "Incidencia no encontrada" };

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

    const ot = await db.ordenTrabajo.create({
      data: {
        numero,
        equipoId:    inc.equipoId,
        tipo:        "CORRECTIVO",
        prioridad:   "ALTA",
        titulo:      `Correctivo — ${inc.titulo}`,
        descripcion: inc.descripcion,
        creadorId:   session.user.id,
        programada:  new Date(),
        estado:      "PROGRAMADA",
        evidencias:  [],
      },
    });

    await db.incidencia.update({
      where: { id: incId },
      data:  { ordenId: ot.id, estado: "EN_ATENCION" },
    });

    revalidatePath("/incidencias");
    revalidatePath("/ordenes");
    return { ok: true, otNumero: numero };
  } catch {
    return { ok: false, error: "Error al generar la OT" };
  }
}

export async function crearIncidencia(input: {
  equipoId:    string;
  titulo:      string;
  descripcion: string;
  severidad:   string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const year = new Date().getFullYear();
    const last = await db.incidencia.findFirst({
      where:   { numero: { startsWith: `INC-${year}-` } },
      orderBy: { numero: "desc" },
      select:  { numero: true },
    });
    const seq    = last
      ? String(Number(last.numero.split("-")[2]) + 1).padStart(4, "0")
      : "0001";
    const numero = `INC-${year}-${seq}`;

    await db.incidencia.create({
      data: {
        numero,
        equipoId:    input.equipoId,
        titulo:      input.titulo,
        descripcion: input.descripcion || null,
        severidad:   input.severidad as Severidad,
        reportaId:   session.user.id,
        estado:      "EVALUACION",
        evidencias:  [],
      },
    });
    revalidatePath("/incidencias");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al reportar la incidencia" };
  }
}
