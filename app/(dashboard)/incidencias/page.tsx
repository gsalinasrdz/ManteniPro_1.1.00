import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo } from "@prisma/client";
import { IncidenciasClient } from "@/components/views/incidencias/incidencias-client";

export default async function IncidenciasPage() {
  const session    = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const esTrabajador = rol === "TRABAJADOR";

  const equipoWhere =
    (rol === "GERENTE_SUCURSAL" || esTrabajador) && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const [incidencias, sucursales, equiposTodos, zonas] = await Promise.all([
    db.incidencia.findMany({
      where: { equipo: equipoWhere },
      include: {
        equipo: {
          select: { tipo: true, cu: true, sucursal: { select: { id: true, nombre: true } } },
        },
        reporta: { select: { nombre: true, iniciales: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(esTrabajador ? { take: 5 } : {}),
    }),
    db.sucursal.findMany({
      where: esTrabajador && userSucId
        ? { id: userSucId }
        : { empresaId, activa: true },
      select: {
        id: true, nombre: true, zonaId: true,
        _count: {
          select: {
            equipos: { where: { estado: { in: [EstadoEquipo.FALLA, EstadoEquipo.MANTENIMIENTO] } } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    db.equipo.findMany({
      where:   equipoWhere,
      select:  { id: true, cu: true, tipo: true, area: true, sucursalId: true },
      orderBy: { tipo: "asc" },
    }),
    db.zona.findMany({
      where:   { empresaId },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const equiposPorSucursal: Record<string, { id: string; cu: string; tipo: string; area: string }[]> = {};
  for (const eq of equiposTodos) {
    if (!equiposPorSucursal[eq.sucursalId]) equiposPorSucursal[eq.sucursalId] = [];
    equiposPorSucursal[eq.sucursalId]!.push({ id: eq.id, cu: eq.cu, tipo: eq.tipo, area: eq.area });
  }

  return (
    <IncidenciasClient
      incidencias={incidencias}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre, zonaId: s.zonaId, equiposConFalla: s._count.equipos }))}
      zonas={zonas}
      puedeFiltraSucursal={rol !== "GERENTE_SUCURSAL" && !esTrabajador}
      equiposPorSucursal={equiposPorSucursal}
      esTrabajador={esTrabajador}
    />
  );
}
