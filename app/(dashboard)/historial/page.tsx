import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoPM } from "@prisma/client";
import { HistorialClient } from "@/components/views/historial/historial-client";
import type { EntradaActividad } from "@/components/views/historial/historial-client";

export default async function HistorialPage() {
  const session = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  // Pull last 90 days of activity
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [ordenes, incidencias, preventivos] = await Promise.all([
    db.ordenTrabajo.findMany({
      where: {
        equipo: equipoWhere,
        createdAt: { gte: since },
      },
      select: {
        id: true, numero: true, titulo: true,
        createdAt: true, iniciada: true, cerrada: true,
        creador: { select: { nombre: true, iniciales: true } },
        tecnico: { select: { nombre: true, iniciales: true } },
        equipo: { select: { sucursal: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    db.incidencia.findMany({
      where: {
        equipo: equipoWhere,
        createdAt: { gte: since },
      },
      select: {
        id: true, numero: true, titulo: true, estado: true,
        createdAt: true, updatedAt: true,
        reporta: { select: { nombre: true, iniciales: true } },
        equipo: { select: { sucursal: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    db.preventivo.findMany({
      where: {
        equipo: equipoWhere,
        estado: EstadoPM.COMPLETADO,
        updatedAt: { gte: since },
      },
      select: {
        id: true, codigo: true, tarea: true, updatedAt: true,
        tecnico: { select: { nombre: true, iniciales: true } },
        equipo: { select: { sucursal: { select: { nombre: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const entradas: EntradaActividad[] = [];

  // ── OT events ─────────────────────────────────────────────────
  for (const ot of ordenes) {
    // Created
    entradas.push({
      id:             `ot-created-${ot.id}`,
      actorNombre:    ot.creador.nombre,
      actorIniciales: ot.creador.iniciales,
      accion:         "creó",
      objeto:         ot.numero,
      tipoObjeto:     "ot",
      descripcion:    ot.titulo,
      sucursal:       ot.equipo.sucursal.nombre,
      createdAt:      ot.createdAt,
    });

    // Iniciada
    if (ot.iniciada && ot.tecnico) {
      entradas.push({
        id:             `ot-iniciada-${ot.id}`,
        actorNombre:    ot.tecnico.nombre,
        actorIniciales: ot.tecnico.iniciales,
        accion:         "inició",
        objeto:         ot.numero,
        tipoObjeto:     "ot",
        sucursal:       ot.equipo.sucursal.nombre,
        createdAt:      ot.iniciada,
      });
    }

    // Cerrada
    if (ot.cerrada && ot.tecnico) {
      entradas.push({
        id:             `ot-cerrada-${ot.id}`,
        actorNombre:    ot.tecnico.nombre,
        actorIniciales: ot.tecnico.iniciales,
        accion:         "cerró",
        objeto:         ot.numero,
        tipoObjeto:     "ot",
        sucursal:       ot.equipo.sucursal.nombre,
        createdAt:      ot.cerrada,
      });
    }
  }

  // ── Incidencia events ─────────────────────────────────────────
  for (const inc of incidencias) {
    // Reported
    entradas.push({
      id:             `inc-reporto-${inc.id}`,
      actorNombre:    inc.reporta.nombre,
      actorIniciales: inc.reporta.iniciales,
      accion:         "reportó incidencia",
      objeto:         inc.numero,
      tipoObjeto:     "incidencia",
      descripcion:    inc.titulo,
      sucursal:       inc.equipo.sucursal.nombre,
      createdAt:      inc.createdAt,
    });

    // Closed / discarded — use updatedAt as timestamp
    if (inc.estado === "CERRADA" || inc.estado === "DESCARTADA") {
      entradas.push({
        id:             `inc-closed-${inc.id}`,
        actorNombre:    inc.reporta.nombre,
        actorIniciales: inc.reporta.iniciales,
        accion:         inc.estado === "CERRADA" ? "cerró incidencia" : "descartó incidencia",
        objeto:         inc.numero,
        tipoObjeto:     "incidencia",
        sucursal:       inc.equipo.sucursal.nombre,
        createdAt:      inc.updatedAt,
      });
    }
  }

  // ── PM completados ────────────────────────────────────────────
  for (const pm of preventivos) {
    if (!pm.tecnico) continue;
    entradas.push({
      id:             `pm-${pm.id}`,
      actorNombre:    pm.tecnico.nombre,
      actorIniciales: pm.tecnico.iniciales,
      accion:         "completó",
      objeto:         pm.codigo,
      tipoObjeto:     "preventivo",
      descripcion:    pm.tarea,
      sucursal:       pm.equipo.sucursal.nombre,
      createdAt:      pm.updatedAt,
    });
  }

  // Sort descending (client re-sorts too, but pre-sorting avoids client work)
  entradas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return <HistorialClient entradas={entradas} />;
}
