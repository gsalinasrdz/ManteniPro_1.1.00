import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoOT, EstadoIncidencia, EstadoEquipo, EstadoPM } from "@prisma/client";
import { KpiCard } from "@/components/atoms/kpi";
import { AlertTriangle, ClipboardList, Wrench, Boxes } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const sucursalWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { id: userSucId }
      : { empresaId, activa: true };

  const [otActivas, incActivas, equiposFalla, pmVencidos, sucursales] = await Promise.all([
    db.ordenTrabajo.count({
      where: {
        equipo: equipoWhere,
        estado: { in: [EstadoOT.PROGRAMADA, EstadoOT.ASIGNADA, EstadoOT.EN_PROCESO] },
      },
    }),
    db.incidencia.count({
      where: {
        equipo: equipoWhere,
        estado: { in: [EstadoIncidencia.EVALUACION, EstadoIncidencia.EN_ATENCION] },
      },
    }),
    db.equipo.count({
      where: {
        sucursal: rol === "GERENTE_SUCURSAL" && userSucId
          ? { id: userSucId }
          : { empresaId },
        estado: { in: [EstadoEquipo.FALLA, EstadoEquipo.MANTENIMIENTO] },
      },
    }),
    db.preventivo.count({
      where: {
        equipo: equipoWhere,
        estado: EstadoPM.VENCIDO,
      },
    }),
    db.sucursal.findMany({
      where: sucursalWhere,
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            equipos: { where: { estado: EstadoEquipo.FALLA } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="OTs activas"
          value={otActivas}
          icon={<ClipboardList size={16} />}
          variant={otActivas > 5 ? "warn" : "default"}
        />
        <KpiCard
          label="Incidencias abiertas"
          value={incActivas}
          icon={<AlertTriangle size={16} />}
          variant={incActivas > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Equipos con falla"
          value={equiposFalla}
          icon={<Boxes size={16} />}
          variant={equiposFalla > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="PMs vencidos"
          value={pmVencidos}
          icon={<Wrench size={16} />}
          variant={pmVencidos > 0 ? "warn" : "ok"}
        />
      </div>

      {/* Sucursales */}
      <div>
        <h2 className="mb-3 text-md font-semibold text-text-primary">Estado por sucursal</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sucursales.map((suc) => {
            const fallos = suc._count.equipos;
            return (
              <div
                key={suc.id}
                className="rounded-lg border border-border bg-bg-primary p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary leading-tight">{suc.nombre}</p>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                      fallos === 0
                        ? "bg-status-ok-bg text-status-ok"
                        : fallos <= 1
                        ? "bg-status-warn-bg text-status-warn"
                        : "bg-status-danger-bg text-status-danger",
                    ].join(" ")}
                  >
                    {fallos === 0 ? "OK" : `${fallos} falla${fallos > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
