"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function crearZona(nombre: string): Promise<ActionResult & { id?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES") return { ok: false, error: "Sin permiso" };

  const { empresaId } = session.user;

  const dup = await db.zona.findFirst({
    where: { empresaId, nombre: { equals: nombre.trim(), mode: "insensitive" } },
  });
  if (dup) return { ok: false, error: "Ya existe una zona con ese nombre" };

  try {
    const zona = await db.zona.create({
      data: { empresaId, nombre: nombre.trim() },
    });
    revalidatePath("/configuracion");
    return { ok: true, id: zona.id };
  } catch {
    return { ok: false, error: "Error al crear zona" };
  }
}

export async function editarZona(zonaId: string, nombre: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES") return { ok: false, error: "Sin permiso" };

  const dup = await db.zona.findFirst({
    where: {
      empresaId: session.user.empresaId,
      nombre: { equals: nombre.trim(), mode: "insensitive" },
      NOT: { id: zonaId },
    },
  });
  if (dup) return { ok: false, error: "Ya existe una zona con ese nombre" };

  try {
    await db.zona.update({ where: { id: zonaId }, data: { nombre: nombre.trim() } });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al editar zona" };
  }
}

export async function eliminarZona(zonaId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES") return { ok: false, error: "Sin permiso" };

  const count = await db.sucursal.count({ where: { zonaId } });
  if (count > 0)
    return { ok: false, error: `No se puede eliminar: tiene ${count} sucursal(es) asignada(s)` };

  try {
    await db.zona.delete({ where: { id: zonaId } });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar zona" };
  }
}
