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
