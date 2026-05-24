"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

// ── CRUD ──────────────────────────────────────────────────────

export async function crearRefaccion(input: {
  sku:          string;
  nombre:       string;
  categoria:    string;
  stock:        number;
  min:          number;
  puntoReorden: number;
  max:          number;
  costo:        number;
  ubicacion?:   string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const sku = input.sku.toUpperCase().trim();

  const dup = await db.refaccion.findFirst({
    where: { sku, empresaId: session.user.empresaId },
  });
  if (dup) return { ok: false, error: `El SKU "${sku}" ya existe en el inventario` };

  try {
    await db.refaccion.create({
      data: {
        sku,
        nombre:       input.nombre,
        categoria:    input.categoria,
        stock:        input.stock,
        min:          input.min,
        puntoReorden: input.puntoReorden,
        max:          input.max,
        costo:        input.costo,
        ubicacion:    input.ubicacion || null,
        empresaId:    session.user.empresaId,
      },
    });
    revalidatePath("/inventario");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear la refacción" };
  }
}

export async function editarRefaccion(
  id: string,
  input: {
    sku:          string;
    nombre:       string;
    categoria:    string;
    min:          number;
    puntoReorden: number;
    max:          number;
    costo:        number;
    ubicacion?:   string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const sku = input.sku.toUpperCase().trim();

  const dup = await db.refaccion.findFirst({
    where: { sku, empresaId: session.user.empresaId, id: { not: id } },
  });
  if (dup) return { ok: false, error: `El SKU "${sku}" ya está en uso por otra refacción` };

  try {
    await db.refaccion.update({
      where: { id },
      data: {
        sku,
        nombre:       input.nombre,
        categoria:    input.categoria,
        min:          input.min,
        puntoReorden: input.puntoReorden,
        max:          input.max,
        costo:        input.costo,
        ubicacion:    input.ubicacion || null,
      },
    });
    revalidatePath("/inventario");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al editar la refacción" };
  }
}

export async function eliminarRefaccion(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const ref = await db.refaccion.findUnique({
    where:  { id },
    select: { stock: true, _count: { select: { usos: true } } },
  });
  if (!ref) return { ok: false, error: "Refacción no encontrada" };
  if (ref.stock > 0)
    return { ok: false, error: "Solo se pueden eliminar refacciones con stock en cero" };
  if (ref._count.usos > 0)
    return { ok: false, error: "Esta refacción tiene historial de uso y no puede eliminarse" };

  try {
    await db.refaccion.delete({ where: { id } });
    revalidatePath("/inventario");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la refacción" };
  }
}

export async function ajustarStock(id: string, delta: number): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const ref = await db.refaccion.findUnique({ where: { id }, select: { stock: true } });
  if (!ref) return { ok: false, error: "Refacción no encontrada" };

  const nuevoStock = ref.stock + delta;
  if (nuevoStock < 0) return { ok: false, error: "El ajuste resultaría en stock negativo" };

  try {
    await db.refaccion.update({ where: { id }, data: { stock: nuevoStock } });
    revalidatePath("/inventario");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al ajustar el stock" };
  }
}

// ── Historial de uso ──────────────────────────────────────────

export type RefaccionUsadaEntry = {
  id:            string;
  cantidad:      number;
  costoUnitario: number;
  orden: { numero: string; titulo: string; programada: Date };
};

export async function getRefaccionHistorial(refaccionId: string): Promise<
  { ok: true; data: RefaccionUsadaEntry[] } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  try {
    const usos = await db.refaccionUsada.findMany({
      where:   { refaccionId },
      include: { orden: { select: { numero: true, titulo: true, programada: true } } },
      orderBy: { orden: { programada: "desc" } },
      take:    30,
    });
    return {
      ok:   true,
      data: usos.map((u) => ({
        id:            u.id,
        cantidad:      u.cantidad,
        costoUnitario: Number(u.costoUnitario),
        orden:         u.orden,
      })),
    };
  } catch {
    return { ok: false, error: "Error al cargar el historial" };
  }
}

// ── Importación XML CFDI ──────────────────────────────────────

export type XMLItem = {
  refaccionId:   string | null;
  sku:           string;
  nombre:        string;
  categoria:     string;
  cantidad:      number;
  valorUnitario: number;
  accion:        "actualizar" | "crear" | "omitir";
};

export async function procesarXMLInventario(
  items: XMLItem[]
): Promise<{ ok: true; actualizadas: number; creadas: number } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };

  const empresaId = session.user.empresaId;
  let actualizadas = 0;
  let creadas = 0;

  try {
    await db.$transaction(async (tx) => {
      for (const item of items) {
        if (item.accion === "omitir") continue;

        if (item.accion === "actualizar" && item.refaccionId) {
          await tx.refaccion.update({
            where: { id: item.refaccionId },
            data:  { stock: { increment: item.cantidad }, costo: item.valorUnitario },
          });
          actualizadas++;
        } else if (item.accion === "crear") {
          const sku = item.sku.toUpperCase().trim() || `SKU-${Date.now()}`;
          await tx.refaccion.create({
            data: {
              sku,
              nombre:       item.nombre,
              categoria:    item.categoria || "General",
              stock:        item.cantidad,
              min:          0,
              puntoReorden: Math.ceil(item.cantidad * 0.3),
              max:          item.cantidad * 2,
              costo:        item.valorUnitario,
              empresaId,
            },
          });
          creadas++;
        }
      }
    });
    revalidatePath("/inventario");
    return { ok: true, actualizadas, creadas };
  } catch {
    return { ok: false, error: "Error al procesar la importación" };
  }
}
