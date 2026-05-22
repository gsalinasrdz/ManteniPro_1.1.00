import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo, EstadoOT, EstadoPM } from "@prisma/client";
import { AlertasClient } from "@/components/views/alertas/alertas-client";
import type { Alerta } from "@/components/views/alertas/alertas-client";

export default async function AlertasPage() {
  const session = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const [equiposEnFalla, incidenciasAbiertas, pmsActivos, refacciones, otsSinTecnico] =
    await Promise.all([
      // Equipos en FALLA — checar si tienen OT activa
      db.equipo.findMany({
        where: { ...equipoWhere, estado: EstadoEquipo.FALLA },
        select: {
          id: true, cu: true, tipo: true, updatedAt: true,
          sucursal: { select: { nombre: true } },
          ordenes: {
            where: { estado: { in: [EstadoOT.PROGRAMADA, EstadoOT.ASIGNADA, EstadoOT.EN_PROCESO] } },
            select: { id: true },
            take: 1,
          },
        },
      }),

      // Incidencias en EVALUACION sin OT generada, severidad ALTA o MEDIA
      db.incidencia.findMany({
        where: {
          equipo: equipoWhere,
          estado: "EVALUACION",
          ordenId: null,
          severidad: { in: ["ALTA", "MEDIA"] },
        },
        select: {
          id: true, numero: true, titulo: true, severidad: true, createdAt: true,
          equipo: { select: { sucursal: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: "asc" },
      }),

      // PMs vencidos o próximos
      db.preventivo.findMany({
        where: {
          equipo: equipoWhere,
          estado: { in: [EstadoPM.VENCIDO, EstadoPM.PROXIMO] },
        },
        select: {
          id: true, codigo: true, tarea: true, estado: true, updatedAt: true,
          equipo: { select: { sucursal: { select: { nombre: true } } } },
        },
        orderBy: { updatedAt: "asc" },
      }),

      // Refacciones: company-wide (el inventario es compartido — todas las alertas son relevantes)
      db.refaccion.findMany({
        where: { empresaId },
        select: { id: true, sku: true, nombre: true, stock: true, min: true, updatedAt: true },
      }),

      // OTs programadas sin técnico asignado
      db.ordenTrabajo.findMany({
        where: {
          equipo: equipoWhere,
          estado: EstadoOT.PROGRAMADA,
          tecnicoId: null,
          programada: { gte: new Date() },
        },
        select: {
          id: true, numero: true, titulo: true, createdAt: true,
          equipo: { select: { sucursal: { select: { nombre: true } } } },
        },
        orderBy: { programada: "asc" },
      }),
    ]);

  const alertas: Alerta[] = [];

  // ── 1. Equipos en FALLA ───────────────────────────────────────
  for (const eq of equiposEnFalla) {
    const tieneOT = eq.ordenes.length > 0;
    alertas.push({
      id:          `eq-${eq.id}`,
      tipo:        "equipo",
      severidad:   tieneOT ? "alta" : "critica",
      titulo:      tieneOT
        ? `${eq.tipo} ${eq.cu} en falla — OT activa`
        : `${eq.tipo} ${eq.cu} en falla — sin OT activa`,
      descripcion: tieneOT
        ? `El equipo está en estado FALLA con una orden de trabajo activa en curso.`
        : `El equipo está en estado FALLA sin ninguna orden de trabajo correctiva abierta.`,
      referencia:  eq.cu,
      sucursal:    eq.sucursal.nombre,
      href:        "/equipos",
      createdAt:   eq.updatedAt,
    });
  }

  // ── 2. Incidencias en EVALUACION sin OT ──────────────────────
  for (const inc of incidenciasAbiertas) {
    alertas.push({
      id:          `inc-${inc.id}`,
      tipo:        "incidencia",
      severidad:   inc.severidad === "ALTA" ? "alta" : "media",
      titulo:      `${inc.numero} sin atender — severidad ${inc.severidad.charAt(0) + inc.severidad.slice(1).toLowerCase()}`,
      descripcion: inc.titulo,
      referencia:  inc.numero,
      sucursal:    inc.equipo.sucursal.nombre,
      href:        "/incidencias",
      createdAt:   inc.createdAt,
    });
  }

  // ── 3. PMs vencidos / próximos ────────────────────────────────
  for (const pm of pmsActivos) {
    alertas.push({
      id:          `pm-${pm.id}`,
      tipo:        "preventivo",
      severidad:   pm.estado === EstadoPM.VENCIDO ? "alta" : "media",
      titulo:      `${pm.codigo} ${pm.estado === EstadoPM.VENCIDO ? "vencido" : "próximo a vencer"}`,
      descripcion: pm.tarea,
      referencia:  pm.codigo,
      sucursal:    pm.equipo.sucursal.nombre,
      href:        "/preventivos",
      createdAt:   pm.updatedAt,
    });
  }

  // ── 4. Inventario bajo mínimo ─────────────────────────────────
  for (const ref of refacciones.filter((r) => r.stock < r.min)) {
    alertas.push({
      id:          `inv-${ref.id}`,
      tipo:        "inventario",
      severidad:   ref.stock === 0 ? "critica" : "alta",
      titulo:      ref.stock === 0
        ? `${ref.nombre} agotado — sin stock`
        : `${ref.nombre} bajo mínimo`,
      descripcion: ref.stock === 0
        ? `${ref.sku}: 0 unidades en stock. Mínimo requerido: ${ref.min}.`
        : `${ref.sku}: stock actual ${ref.stock}, mínimo requerido ${ref.min}.`,
      referencia:  ref.sku,
      href:        "/inventario",
      createdAt:   ref.updatedAt,
    });
  }

  // ── 5. OTs sin técnico asignado ───────────────────────────────
  for (const ot of otsSinTecnico) {
    alertas.push({
      id:          `ot-${ot.id}`,
      tipo:        "ot",
      severidad:   "media",
      titulo:      `${ot.numero} sin técnico asignado`,
      descripcion: ot.titulo,
      referencia:  ot.numero,
      sucursal:    ot.equipo.sucursal.nombre,
      href:        "/ordenes",
      createdAt:   ot.createdAt,
    });
  }

  return <AlertasClient alertas={alertas} />;
}
