"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, addMonths } from "date-fns";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function calcNextProx(frecuencia: string, from: Date): Date {
  switch (frecuencia) {
    case "SEMANAL":    return addDays(from, 7);
    case "QUINCENAL":  return addDays(from, 15);
    case "MENSUAL":    return addMonths(from, 1);
    case "BIMESTRAL":  return addMonths(from, 2);
    case "TRIMESTRAL": return addMonths(from, 3);
    case "SEMESTRAL":  return addMonths(from, 6);
    case "ANUAL":      return addMonths(from, 12);
    default:           return addMonths(from, 1);
  }
}

export async function crearPreventivo(input: {
  equipoId:   string;
  tarea:      string;
  frecuencia: string;
  prox:       string;
  tecnicoId?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const last = await db.preventivo.findFirst({
      where:   { codigo: { startsWith: "PM-" } },
      orderBy: { codigo: "desc" },
      select:  { codigo: true },
    });
    const seq    = last
      ? String(Number(last.codigo.replace("PM-", "")) + 1).padStart(3, "0")
      : "001";
    const codigo = `PM-${seq}`;

    await db.preventivo.create({
      data: {
        codigo,
        equipoId:   input.equipoId,
        tarea:      input.tarea,
        frecuencia: input.frecuencia as import("@prisma/client").Frecuencia,
        prox:       new Date(input.prox),
        estado:     "PROGRAMADO",
        tecnicoId:  input.tecnicoId || null,
      },
    });
    revalidatePath("/preventivos");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear el PM" };
  }
}

export async function completarPM(pmId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const pm = await db.preventivo.findUnique({
      where:  { id: pmId },
      select: { frecuencia: true },
    });
    if (!pm) return { ok: false, error: "PM no encontrado" };

    const nextProx = calcNextProx(pm.frecuencia, new Date());

    await db.preventivo.update({
      where: { id: pmId },
      data:  { estado: "COMPLETADO", prox: nextProx },
    });
    revalidatePath("/preventivos");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al completar el PM" };
  }
}
