import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoOT, EstadoIncidencia, EstadoEquipo, EstadoPM } from "@prisma/client";
import { KpiCard } from "@/components/atoms/kpi";
import { AlertTriangle, ClipboardList, Wrench, Boxes } from "lucide-react";
import Link from "next/link";
import { format, isToday, isPast, startOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  const { empresaId, sucursalId: userSucId, rol } = session!.user;

  // ── Vista técnico ────────────────────────────────────────────
  if (rol === "TECNICO") {
    const userId = session!.user.id;
    const otsTecnico = await db.ordenTrabajo.findMany({
      where: {
        tecnicoId: userId,
        estado: { in: [EstadoOT.PROGRAMADA, EstadoOT.ASIGNADA, EstadoOT.EN_PROCESO] },
      },
      select: {
        id: true, numero: true, titulo: true, estado: true,
        programada: true, prioridad: true,
        equipo: { select: { tipo: true, sucursal: { select: { nombre: true } } } },
      },
      orderBy: { programada: "asc" },
    });

    const hoy    = startOfDay(new Date());
    const venc   = otsTecnico.filter((o) => isPast(startOfDay(new Date(o.programada))) && !isToday(new Date(o.programada)));
    const deHoy  = otsTecnico.filter((o) => isToday(new Date(o.programada)));
    const resto  = otsTecnico.filter((o) => !isPast(startOfDay(new Date(o.programada))) && !isToday(new Date(o.programada)));

    const PRIORIDAD_CLS: Record<string, string> = {
      ALTA: "border-l-status-danger", MEDIA: "border-l-status-warn", BAJA: "border-l-status-ok",
    };
    const ESTADO_CLS: Record<string, string> = {
      PROGRAMADA: "bg-bg-tertiary text-text-tertiary",
      ASIGNADA:   "bg-blue-50 text-brand-blue",
      EN_PROCESO: "bg-status-warn-bg text-status-warn",
    };
    const ESTADO_LBL: Record<string, string> = {
      PROGRAMADA: "Programada", ASIGNADA: "Asignada", EN_PROCESO: "En proceso",
    };

    function OtCard({ ot }: { ot: typeof otsTecnico[0] }) {
      return (
        <Link href="/ordenes" className={`flex flex-col gap-1 rounded-lg border border-border border-l-4 bg-bg-primary p-3 transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-light ${PRIORIDAD_CLS[ot.prioridad] ?? ""}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-text-primary line-clamp-2 flex-1">{ot.titulo}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_CLS[ot.estado] ?? ""}`}>
              {ESTADO_LBL[ot.estado] ?? ot.estado}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
            <span className="font-mono">{ot.numero}</span>
            <span>·</span>
            <span>{ot.equipo.tipo}</span>
            <span>·</span>
            <span>{ot.equipo.sucursal.nombre}</span>
          </div>
        </Link>
      );
    }

    function Group({ title, ots, emptyMsg, accent }: { title: string; ots: typeof otsTecnico; emptyMsg: string; accent?: string }) {
      return (
        <div>
          <h2 className={`mb-2 text-sm font-semibold ${accent ?? "text-text-primary"}`}>{title}</h2>
          {ots.length === 0
            ? <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-text-tertiary">{emptyMsg}</p>
            : <div className="flex flex-col gap-2">{ots.map((o) => <OtCard key={o.id} ot={o} />)}</div>
          }
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Mi trabajo</h1>
            <p className="mt-0.5 text-sm text-text-tertiary capitalize">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <Link
            href="/ordenes"
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            <ClipboardList size={14} />
            Ver todas mis OTs
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Group title={`Vencidas (${venc.length})`} ots={venc} emptyMsg="Sin OTs vencidas" accent="text-status-danger" />
          <Group title={`Hoy (${deHoy.length})`} ots={deHoy} emptyMsg="Sin OTs para hoy" accent="text-brand-blue" />
          <Group title={`Próximas (${resto.length})`} ots={resto} emptyMsg="Sin OTs próximas" />
        </div>
      </div>
    );
  }

  const equipoWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { sucursalId: userSucId }
      : { sucursal: { empresaId } };

  const sucursalWhere =
    rol === "GERENTE_SUCURSAL" && userSucId
      ? { id: userSucId }
      : { empresaId, activa: true };

  const now         = new Date();
  const startThis   = startOfMonth(now);
  const startLast   = startOfMonth(subMonths(now, 1));
  const endLast     = endOfMonth(subMonths(now, 1));

  const [otActivas, incActivas, equiposFalla, pmVencidos, sucursales,
         otThisMes, otLastMes, incThisMes, incLastMes] = await Promise.all([
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
    db.ordenTrabajo.count({ where: { equipo: equipoWhere, createdAt: { gte: startThis } } }),
    db.ordenTrabajo.count({ where: { equipo: equipoWhere, createdAt: { gte: startLast, lte: endLast } } }),
    db.incidencia.count({ where: { equipo: equipoWhere, createdAt: { gte: startThis } } }),
    db.incidencia.count({ where: { equipo: equipoWhere, createdAt: { gte: startLast, lte: endLast } } }),
  ]);

  const otTrend  = otThisMes  - otLastMes;
  const incTrend = incThisMes - incLastMes;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="OTs activas"
          value={otActivas}
          icon={<ClipboardList size={16} />}
          variant={otActivas > 5 ? "warn" : "default"}
          trend={{ delta: otTrend }}
        />
        <KpiCard
          label="Incidencias abiertas"
          value={incActivas}
          icon={<AlertTriangle size={16} />}
          variant={incActivas > 0 ? "danger" : "ok"}
          trend={{ delta: incTrend }}
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
