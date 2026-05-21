"use client";

import { usePathname, useRouter } from "next/navigation";
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
  Sparkles,
  Settings,
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
      { id: "dashboard", label: "Dashboard", href: "/",         icon: LayoutDashboard },
      { id: "alertas",   label: "Alertas",   href: "/alertas",  icon: AlertTriangle, badge: 2 },
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
      { id: "historial", label: "Historial", href: "/historial", icon: History },
    ],
  },
  {
    section: "Producto",
    items: [
      { id: "plan",          label: "Plan de implementación",    href: "/plan",          icon: Sparkles },
      { id: "extras",        label: "Funcionalidades adicionales", href: "/extras",      icon: Sparkles },
      { id: "configuracion", label: "Configuración",              href: "/configuracion", icon: Settings },
    ],
  },
];

interface SidebarProps {
  usuario: { nombre: string; rol: string; iniciales: string };
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        {NAV.map((section) => (
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
                  {item.badge && (
                    <span className="rounded-full bg-status-danger-bg px-1.5 py-px text-[10px] font-semibold text-status-danger">
                      {item.badge}
                    </span>
                  )}
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
            <div className="truncate text-[10px] text-text-tertiary">{usuario.rol}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
