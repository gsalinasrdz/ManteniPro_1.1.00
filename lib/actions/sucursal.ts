"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function asignarZonaSucursal(
  sucursalId: string,
  zonaId: string | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  try {
    await db.sucursal.update({
      where: { id: sucursalId },
      data:  { zonaId: zonaId ?? null },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al asignar zona" };
  }
}

export async function crearSucursal(input: {
  nombre:      string;
  zonaId:      string | null;
  ciudad?:     string;
  direccion?:  string;
  responsable?: string;
  telefono?:   string;
}): Promise<ActionResult & { id?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  const { empresaId } = session.user;

  try {
    const dup = await db.sucursal.findFirst({
      where: { empresaId, nombre: { equals: input.nombre.trim(), mode: "insensitive" } },
    });
    if (dup) return { ok: false, error: "Ya existe una sucursal con ese nombre" };

    const suc = await db.sucursal.create({
      data: {
        empresaId,
        nombre:      input.nombre.trim(),
        zonaId:      input.zonaId || null,
        ciudad:      input.ciudad?.trim()      || null,
        direccion:   input.direccion?.trim()   || null,
        responsable: input.responsable?.trim() || null,
        telefono:    input.telefono?.trim()    || null,
        activa:      true,
      },
    });
    revalidatePath("/configuracion");
    return { ok: true, id: suc.id };
  } catch {
    return { ok: false, error: "Error al crear sucursal" };
  }
}

export async function editarSucursal(input: {
  sucursalId:   string;
  nombre:       string;
  zonaId:       string | null;
  ciudad?:      string;
  direccion?:   string;
  responsable?: string;
  telefono?:    string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  try {
    const dup = await db.sucursal.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nombre:    { equals: input.nombre.trim(), mode: "insensitive" },
        NOT:       { id: input.sucursalId },
      },
    });
    if (dup) return { ok: false, error: "Ya existe una sucursal con ese nombre" };

    await db.sucursal.update({
      where: { id: input.sucursalId },
      data: {
        nombre:      input.nombre.trim(),
        zonaId:      input.zonaId || null,
        ciudad:      input.ciudad?.trim()      || null,
        direccion:   input.direccion?.trim()   || null,
        responsable: input.responsable?.trim() || null,
        telefono:    input.telefono?.trim()    || null,
      },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al editar sucursal" };
  }
}

export async function toggleActivaSucursal(
  sucursalId: string,
  activa: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  try {
    await db.sucursal.update({ where: { id: sucursalId }, data: { activa } });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar sucursal" };
  }
}

export async function eliminarSucursal(sucursalId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  try {
    const tieneEquipos = await db.equipo.count({ where: { sucursalId } });
    if (tieneEquipos > 0)
      return { ok: false, error: `No se puede eliminar: tiene ${tieneEquipos} equipo(s) registrado(s)` };

    await db.sucursal.delete({ where: { id: sucursalId } });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar sucursal" };
  }
}
