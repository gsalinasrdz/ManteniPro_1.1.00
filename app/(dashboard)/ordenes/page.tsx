import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo } from "@prisma/client";
import { OrdenesClient } from "@/components/views/ordenes/ordenes-client";

export default async function OrdenesPage() {
  const session    = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const otWhere =
    rol === "TECNICO"
      ? { tecnicoId: session!.user.id }
      : { equipo: equipoWhere };

  const [ordenes, sucursales, equiposTodos, tecnicos, zonas, tecnicoOTCounts] = await Promise.all([
    db.ordenTrabajo.findMany({
      where: otWhere,
      include: {
        equipo: {
          select: { tipo: true, cu: true, sucursal: { select: { id: true, nombre: true } } },
        },
        tecnico:  { select: { nombre: true, iniciales: true } },
        facturas: {
          orderBy: { fechaEmision: "asc" },
          select: {
            id: true, numero: true, uuid: true, proveedor: true,
            nombreEmisor: true, rfcEmisor: true,
            monto: true, subtotal: true, iva: true,
            fechaEmision: true, fechaPago: true,
            estado: true, concepto: true,
          },
        },
        bitacora: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, texto: true, createdAt: true,
            autor: { select: { nombre: true, iniciales: true } },
          },
        },
      },
      orderBy: { programada: "desc" },
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
      select:  { id: true, cu: true, tipo: true, area: true, sucursalId: true },
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
    db.ordenTrabajo.groupBy({
      by:    ["tecnicoId"],
      where: {
        equipo:    equipoWhere,
        estado:    { in: ["PROGRAMADA", "ASIGNADA", "EN_PROCESO"] },
        tecnicoId: { not: null },
      },
      _count: { id: true },
    }),
  ]);

  const equiposPorSucursal: Record<string, { id: string; cu: string; tipo: string; area: string }[]> = {};
  for (const eq of equiposTodos) {
    if (!equiposPorSucursal[eq.sucursalId]) equiposPorSucursal[eq.sucursalId] = [];
    equiposPorSucursal[eq.sucursalId]!.push({ id: eq.id, cu: eq.cu, tipo: eq.tipo, area: eq.area });
  }

  const tecnicoCargas: Record<string, number> = {};
  for (const row of tecnicoOTCounts) {
    if (row.tecnicoId) tecnicoCargas[row.tecnicoId] = row._count.id;
  }

  return (
    <OrdenesClient
      ordenes={ordenes as any}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre, zonaId: s.zonaId, equiposConFalla: s._count.equipos }))}
      zonas={zonas}
      puedeFiltraSucursal={rol !== "GERENTE_SUCURSAL"}
      equiposPorSucursal={equiposPorSucursal}
      tecnicos={tecnicos}
      tecnicoCargas={tecnicoCargas}
    />
  );
}
