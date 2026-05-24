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

// ── Historial ───────────────────────────────────────────────────

export type HistorialEntry = {
  tipo:          "ot" | "incidencia";
  id:            string;
  numero:        string;
  titulo:        string;
  estado:        string;
  fecha:         Date;
  tecnicoNombre?: string;
  costo?:        number;
};

export async function getEquipoHistorial(
  equipoId: string
): Promise<{ ok: boolean; data?: HistorialEntry[]; error?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const [ots, incidencias] = await Promise.all([
      db.ordenTrabajo.findMany({
        where:   { equipoId },
        select:  {
          id: true, numero: true, titulo: true, estado: true,
          programada: true, costo: true,
          tecnico: { select: { nombre: true } },
        },
        orderBy: { programada: "desc" },
        take:    30,
      }),
      db.incidencia.findMany({
        where:   { equipoId },
        select:  { id: true, numero: true, titulo: true, estado: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take:    30,
      }),
    ]);

    const entries: HistorialEntry[] = [
      ...ots.map((o) => ({
        tipo:          "ot" as const,
        id:            o.id,
        numero:        o.numero,
        titulo:        o.titulo,
        estado:        o.estado,
        fecha:         o.programada,
        tecnicoNombre: o.tecnico?.nombre,
        costo:         o.costo ? Number(o.costo) : undefined,
      })),
      ...incidencias.map((i) => ({
        tipo:   "incidencia" as const,
        id:     i.id,
        numero: i.numero,
        titulo: i.titulo,
        estado: i.estado,
        fecha:  i.createdAt,
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return { ok: true, data: entries };
  } catch {
    return { ok: false, error: "Error al cargar historial" };
  }
}
