"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Criticidad, EstadoEquipo } from "@prisma/client";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function crearEquipo(input: {
  sucursalId: string;
  tipo:       string;
  area:       string;
  marca:      string;
  modelo:     string;
  criticidad: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    // Auto-generate CU: CU-S + 4 random digits
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    const existing = await db.equipo.findFirst({
      where: { sucursal: { empresaId: session.user.empresaId } },
      orderBy: { createdAt: "desc" },
      select: { cu: true },
    });
    // Find next available sequential CU
    const allCUs = await db.equipo.findMany({
      where:  { sucursal: { empresaId: session.user.empresaId } },
      select: { cu: true },
    });
    const used = new Set(allCUs.map((e) => e.cu));
    let seq = 1000;
    while (used.has(`CU-S${seq}`)) seq++;
    const cu = `CU-S${seq}`;
    void existing; void rand;

    await db.equipo.create({
      data: {
        cu,
        sucursalId: input.sucursalId,
        tipo:       input.tipo,
        area:       input.area,
        marca:      input.marca,
        modelo:     input.modelo,
        criticidad: input.criticidad as Criticidad,
        estado:     EstadoEquipo.OPERATIVO,
        horas:      0,
      },
    });
    revalidatePath("/equipos");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear el equipo" };
  }
}

export async function editarEquipo(
  equipoId: string,
  input: {
    tipo:       string;
    area:       string;
    marca:      string;
    modelo:     string;
    criticidad: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.equipo.update({
      where: { id: equipoId },
      data: {
        tipo:       input.tipo,
        area:       input.area,
        marca:      input.marca,
        modelo:     input.modelo,
        criticidad: input.criticidad as Criticidad,
      },
    });
    revalidatePath("/equipos");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al editar el equipo" };
  }
}

export async function transitionEquipo(
  equipoId: string,
  nextEstado: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    await db.equipo.update({
      where: { id: equipoId },
      data:  { estado: nextEstado as EstadoEquipo },
    });
    revalidatePath("/equipos");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar el equipo" };
  }
}
