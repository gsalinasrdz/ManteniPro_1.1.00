import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo } from "@prisma/client";
import { PreventivoClient } from "@/components/views/preventivos/preventivos-client";

export default async function PreventivosPage() {
  const session    = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const [preventivos, sucursales, equiposTodos, tecnicos, zonas] = await Promise.all([
    db.preventivo.findMany({
      where: { equipo: equipoWhere },
      include: {
        equipo: {
          select: { tipo: true, cu: true, sucursal: { select: { id: true, nombre: true } } },
        },
        tecnico: { select: { nombre: true, iniciales: true } },
      },
      orderBy: { prox: "asc" },
    }),
    db.sucursal.findMany({
      where: { empresaId, activa: true },
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
      select:  { id: true, cu: true, tipo: true, sucursalId: true, sucursal: { select: { nombre: true } } },
      orderBy: { tipo: "asc" },
    }),
    db.usuario.findMany({
      where:   { empresaId, rol: "TECNICO", activo: true },
      select:  { id: true, nombre: true, iniciales: true },
      orderBy: { nombre: "asc" },
    }),
    db.zona.findMany({
      where:   { empresaId },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <PreventivoClient
      preventivos={preventivos}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre, zonaId: s.zonaId, equiposConFalla: s._count.equipos }))}
      zonas={zonas}
      equipos={equiposTodos.map((e) => ({ id: e.id, cu: e.cu, tipo: e.tipo, sucursalId: e.sucursalId, sucursalNombre: e.sucursal.nombre }))}
      tecnicos={tecnicos}
      puedeFiltraSucursal={rol !== "GERENTE_SUCURSAL"}
    />
  );
}
