import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EstadoEquipo, EstadoIncidencia, EstadoPM } from "@prisma/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/command-palette/command-palette";

const TITLES: Record<string, string> = {
  "/": "Resumen general",
  "/alertas": "Alertas activas",
  "/incidencias": "Incidencias reportadas",
  "/ordenes": "Órdenes de trabajo",
  "/preventivos": "Mantenimientos preventivos",
  "/equipos": "Catálogo de equipos",
  "/inventario": "Refacciones e insumos",
  "/calendario": "Programa de mantenimientos",
  "/historial": "Historial de actividad",
  "/plan": "Roadmap de nuevas funcionalidades",
  "/extras": "Catálogo de propuestas adicionales",
  "/configuracion": "Configuración del sistema",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [empresa, alertCount] = await Promise.all([
    db.empresa
      .findUnique({ where: { id: session.user.empresaId }, select: { nombre: true } })
      .catch(() => null),
    (async () => {
      const eid = session.user.empresaId;
      const equipoWhere = { sucursal: { empresaId: eid } };
      const [eq, inc, pm] = await Promise.all([
        db.equipo.count({ where: { ...equipoWhere, estado: { in: [EstadoEquipo.FALLA, EstadoEquipo.MANTENIMIENTO] } } }),
        db.incidencia.count({ where: { equipo: equipoWhere, estado: EstadoIncidencia.EVALUACION } }),
        db.preventivo.count({ where: { equipo: equipoWhere, estado: EstadoPM.VENCIDO } }),
      ]);
      return eq + inc + pm;
    })().catch(() => 0),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        usuario={{
          nombre: session.user.name,
          rol: session.user.rol,
          iniciales: session.user.iniciales,
        }}
        alertCount={alertCount}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          empresaNombre={empresa?.nombre ?? ""}
          title="Resumen general"
        />
        <div className="flex-1 overflow-y-auto bg-bg-tertiary p-6">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
