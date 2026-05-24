import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PresupuestosClient } from "@/components/views/presupuestos/presupuestos-client";
import { startOfMonth, subMonths, format } from "date-fns";

export default async function PresupuestosPage() {
  const session = await auth();
  const { empresaId } = session!.user;

  const hace6Meses = subMonths(startOfMonth(new Date()), 5);

  const [sucursales, tecnicos, facturas, ordenesCostos, presupuestos] = await Promise.all([
    db.sucursal.findMany({
      where:   { empresaId, activa: true },
      select:  { id: true, nombre: true, zonaId: true },
      orderBy: { nombre: "asc" },
    }),

    db.usuario.findMany({
      where:   { empresaId, rol: "TECNICO", activo: true },
      select:  { id: true, nombre: true, iniciales: true },
      orderBy: { nombre: "asc" },
    }),

    db.factura.findMany({
      where: {
        orden: { equipo: { sucursal: { empresaId } } },
        fechaEmision: { gte: hace6Meses },
      },
      select: {
        id: true, numero: true, uuid: true,
        proveedor: true, rfcEmisor: true,
        monto: true, subtotal: true, iva: true,
        fechaEmision: true, fechaPago: true,
        estado: true, concepto: true,
        ordenId: true, tecnicoId: true,
        orden: {
          select: {
            numero: true, titulo: true,
            equipo: { select: { sucursal: { select: { id: true, nombre: true } } } },
          },
        },
        tecnico: { select: { nombre: true, iniciales: true } },
      },
      orderBy: { fechaEmision: "desc" },
    }),

    db.ordenTrabajo.findMany({
      where: {
        equipo: { sucursal: { empresaId } },
        OR: [{ costoEstimado: { not: null } }, { costo: { not: null } }],
      },
      select: {
        id: true, numero: true, titulo: true,
        costoEstimado: true, costo: true,
        estado: true, cerrada: true, tecnicoId: true,
        equipo: { select: { sucursal: { select: { id: true, nombre: true } } } },
        tecnico: { select: { nombre: true, iniciales: true } },
      },
    }),

    db.presupuestoSucursal.findMany({
      where: { sucursal: { empresaId } },
      select: { sucursalId: true, periodo: true, monto: true },
    }),
  ]);

  return (
    <PresupuestosClient
      sucursales={sucursales}
      tecnicos={tecnicos}
      facturas={facturas as any}
      ordenesCostos={ordenesCostos as any}
      presupuestos={presupuestos as any}
    />
  );
}
