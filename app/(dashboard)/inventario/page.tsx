import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InventarioClient } from "@/components/views/inventario/inventario-client";

export default async function InventarioPage() {
  const session   = await auth();
  const empresaId = session!.user.empresaId;

  const refacciones = await db.refaccion.findMany({
    where: { empresaId },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  // Prisma returns Decimal for costo — coerce to number for the client
  const refaccionesFormatted = refacciones.map((r) => ({
    ...r,
    costo: Number(r.costo),
  }));

  return <InventarioClient refacciones={refaccionesFormatted} />;
}
