import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoOT, EstadoPM } from "@prisma/client";
import { CalendarioClient } from "@/components/views/calendario/calendario-client";
import { format } from "date-fns";

export default async function CalendarioPage() {
  const session = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const [ordenes, preventivos] = await Promise.all([
    db.ordenTrabajo.findMany({
      where: {
        equipo: equipoWhere,
        estado: { notIn: [EstadoOT.CERRADA, EstadoOT.CANCELADA] },
      },
      select: {
        id:        true,
        numero:    true,
        titulo:    true,
        programada: true,
        equipo: {
          select: { sucursal: { select: { nombre: true } } },
        },
      },
      orderBy: { programada: "asc" },
    }),
    db.preventivo.findMany({
      where: {
        equipo: equipoWhere,
        estado: { not: EstadoPM.COMPLETADO },
      },
      select: {
        id:     true,
        codigo: true,
        tarea:  true,
        prox:   true,
        estado: true,
        equipo: {
          select: { sucursal: { select: { nombre: true } } },
        },
      },
      orderBy: { prox: "asc" },
    }),
  ]);

  const eventos = [
    ...ordenes.map((ot) => ({
      id:         ot.id,
      tipo:       "ot" as const,
      titulo:     ot.titulo,
      referencia: ot.numero,
      sucursal:   ot.equipo.sucursal.nombre,
      fecha:      ot.programada,
      hora:       format(ot.programada, "HH:mm"),
    })),
    ...preventivos.map((pm) => {
      const tipo =
        pm.estado === EstadoPM.VENCIDO  ? ("pm_vencido"    as const) :
        pm.estado === EstadoPM.PROXIMO  ? ("pm_proximo"    as const) :
                                          ("pm_programado" as const);
      return {
        id:         pm.id,
        tipo,
        titulo:     pm.tarea,
        referencia: pm.codigo,
        sucursal:   pm.equipo.sucursal.nombre,
        fecha:      pm.prox,
        hora:       "08:00",
      };
    }),
  ];

  return <CalendarioClient eventos={eventos} hoy={new Date()} />;
}
