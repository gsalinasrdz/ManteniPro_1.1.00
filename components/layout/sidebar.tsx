"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  Wrench,
  Boxes,
  Package,
  Calendar,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
};

type NavSection = { section: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    section: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/",        icon: LayoutDashboard },
      { id: "alertas",   label: "Alertas",   href: "/alertas", icon: AlertTriangle },
    ],
  },
  {
    section: "Operación",
    items: [
      { id: "incidencias", label: "Incidencias",        href: "/incidencias", icon: AlertCircle },
      { id: "ordenes",     label: "Órdenes de trabajo", href: "/ordenes",     icon: ClipboardList },
      { id: "preventivos", label: "Preventivos",        href: "/preventivos", icon: Wrench },
    ],
  },
  {
    section: "Recursos",
    items: [
      { id: "equipos",    label: "Equipos",    href: "/equipos",    icon: Boxes },
      { id: "inventario", label: "Inventario", href: "/inventario", icon: Package },
      { id: "calendario", label: "Calendario", href: "/calendario", icon: Calendar },
    ],
  },
  {
    section: "Reportes",
    items: [
      { id: "historial",     label: "Historial",     href: "/historial",     icon: History  },
      { id: "configuracion", label: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
];

// Items visibles por rol. undefined = sin restricción (ve todo).
const NAV_VISIBLE: Record<string, Set<string>> = {
  GERENTE_SUCURSAL: new Set([
    "dashboard", "alertas", "incidencias", "ordenes",
    "preventivos", "equipos", "inventario", "calendario",
    "historial", "configuracion",
  ]),
  TECNICO: new Set(["dashboard", "incidencias", "ordenes", "calendario", "historial"]),
  TRABAJADOR: new Set(["incidencias"]),
};

const ROL_LABEL: Record<string, string> = {
  GERENTE_OPERACIONES: "Gerente Operaciones",
  GERENTE_SUCURSAL: "Gerente Sucursal",
  TECNICO: "Técnico",
  TRABAJADOR: "Trabajador",
};

interface SidebarProps {
  usuario: { nombre: string; rol: string; iniciales: string };
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const allowed = NAV_VISIBLE[usuario.rol];
  const visibleNav = NAV.map((section) => ({
    ...section,
    items: allowed
      ? section.items.filter((item) => allowed.has(item.id))
      : section.items,
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-border bg-bg-primary">
      {/* Logo */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-sm font-semibold tracking-tight text-white">
            MP
          </div>
          <div>
            <div className="text-md font-semibold tracking-tight">ManteniPro</div>
            <div className="mt-0.5 text-[10px] text-text-tertiary">Mantenimiento</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {visibleNav.map((section) => (
          <div key={section.section} className="mb-1.5">
            <div className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {section.section}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "mb-px flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-base transition-colors",
                    active
                      ? "bg-brand-blue-light font-medium text-brand-blue"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                  )}
                >
                  <Icon size={15} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-light text-xs font-semibold text-brand-blue">
            {usuario.iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{usuario.nombre}</div>
            <div className="truncate text-[10px] text-text-tertiary">
              {ROL_LABEL[usuario.rol] ?? usuario.rol}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesión"
            className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
