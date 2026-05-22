import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo } from "@prisma/client";
import { EquiposClient } from "@/components/views/equipos/equipos-client";

export default async function EquiposPage() {
  const session    = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const [equipos, sucursales] = await Promise.all([
    db.equipo.findMany({
      where: equipoWhere,
      include: {
        sucursal: { select: { id: true, nombre: true } },
      },
      orderBy: [{ sucursal: { nombre: "asc" } }, { tipo: "asc" }],
    }),
    db.sucursal.findMany({
      where: { empresaId, activa: true },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            equipos: { where: { estado: { in: [EstadoEquipo.FALLA, EstadoEquipo.MANTENIMIENTO] } } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <EquiposClient
      equipos={equipos}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre, equiposConFalla: s._count.equipos }))}
      puedeFiltraSucursal={rol !== "GERENTE_SUCURSAL"}
    />
  );
}
