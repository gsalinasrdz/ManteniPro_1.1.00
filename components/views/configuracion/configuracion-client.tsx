"use client";

import { useState } from "react";
import {
  Building2, MapPin, Users, Settings2, Bell,
  CheckCircle2, XCircle, ChevronRight, Plus, Loader2, KeyRound, Pencil, Trash2, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortenSucursal } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import { toast } from "sonner";
import { cambiarRolUsuario, toggleActivoUsuario, invitarUsuario, editarUsuario, eliminarUsuario, cambiarPassword } from "@/lib/actions/usuario";
import { asignarZonaSucursal, crearSucursal, editarSucursal, toggleActivaSucursal, eliminarSucursal } from "@/lib/actions/sucursal";
import { crearZona, editarZona, eliminarZona } from "@/lib/actions/zona";
import { useSession } from "next-auth/react";

// ── Types ──────────────────────────────────────────────────────

type EmpresaData = { nombre: string; rfc: string; concepto: string };

type SucursalData = {
  id:          string;
  nombre:      string;
  ciudad?:     string;
  direccion?:  string;
  responsable?: string;
  telefono?:   string;
  activa:      boolean;
  zonaId:      string | null;
  zonaNombre:  string | null;
};

type ZonaData = { id: string; nombre: string; sucursalesCount: number };

type UsuarioData = {
  id:        string;
  nombre:    string;
  iniciales: string;
  email:     string;
  rol:       string;
  activo:    boolean;
  sucursal:  { id: string; nombre: string } | null;
};

type SucursalOpt = { id: string; nombre: string };

interface ConfiguracionClientProps {
  empresa:       EmpresaData;
  sucursales:    SucursalData[];
  usuarios:      UsuarioData[];
  sucursalesOpts: SucursalOpt[];
  zonas:         ZonaData[];
}

// ── Visual helpers ─────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
  GERENTE_OPERACIONES: "Gerente Operaciones",
  GERENTE_SUCURSAL:    "Gerente Sucursal",
  TECNICO:             "Técnico",
  TRABAJADOR:            "Trabajador",
};
const ROL_TONE: Record<string, "info" | "warn" | "ok" | "gray"> = {
  GERENTE_OPERACIONES: "info",
  GERENTE_SUCURSAL:    "warn",
  TECNICO:             "ok",
  TRABAJADOR:            "gray",
};

const ROLES = ["GERENTE_OPERACIONES", "GERENTE_SUCURSAL", "TECNICO", "TRABAJADOR"] as const;

type TabId = "empresa" | "sucursales" | "zonas" | "usuarios" | "parametros" | "notificaciones" | "micuenta";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "empresa",        label: "Empresa",       icon: Building2 },
  { id: "sucursales",     label: "Sucursales",    icon: MapPin    },
  { id: "zonas",          label: "Zonas",         icon: Layers    },
  { id: "usuarios",       label: "Usuarios",      icon: Users     },
  { id: "parametros",     label: "Parámetros PM", icon: Settings2 },
  { id: "notificaciones", label: "Notificaciones",icon: Bell      },
  { id: "micuenta",       label: "Mi cuenta",     icon: KeyRound  },
];

// ── Shared atoms ───────────────────────────────────────────────

function SectionRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className={cn("text-right text-sm text-text-primary", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function Pendiente() {
  return (
    <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-tertiary">
      Próximamente
    </span>
  );
}

// ── Tab: Empresa ───────────────────────────────────────────────

function TabEmpresa({ empresa, total }: { empresa: EmpresaData; total: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-bg-primary p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-primary">Datos generales</h3>
        <p className="mb-4 text-xs text-text-tertiary">Para modificar estos datos, contacta al equipo de ManteniPro.</p>
        <SectionRow label="Nombre de la empresa" value={empresa.nombre} />
        <SectionRow label="RFC" value={empresa.rfc} mono />
        {empresa.concepto && <SectionRow label="Concepto" value={empresa.concepto} />}
        <SectionRow
          label="Plan contratado"
          value={
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">Pro</span>
              <span className="rounded-full bg-status-info-bg px-2 py-px text-[10px] font-semibold text-status-info">Activo</span>
            </span>
          }
        />
        <SectionRow label="Usuarios registrados" value={`${total} usuarios`} />
      </div>

      <div className="rounded-xl border border-border bg-bg-primary p-5">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Acciones de cuenta</h3>
        <div className="flex flex-col gap-2">
          {["Cambiar nombre de empresa","Actualizar datos de facturación","Descargar contrato de servicio","Solicitar cambio de plan"].map((a) => (
            <button key={a} disabled className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm text-text-tertiary opacity-60">
              {a}
              <div className="flex items-center gap-2"><Pendiente /><ChevronRight size={14} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Sucursal (Crear / Editar) ──────────────────────────

function SucursalModal({
  sucursal,
  zonas,
  onClose,
  onSaved,
}: {
  sucursal:  SucursalData | null;
  zonas:     ZonaData[];
  onClose:   () => void;
  onSaved:   (s: SucursalData) => void;
}) {
  const esEdicion = !!sucursal;
  const [nombre,      setNombre]      = useState(sucursal?.nombre      ?? "");
  const [zonaId,      setZonaId]      = useState(sucursal?.zonaId      ?? "");
  const [ciudad,      setCiudad]      = useState(sucursal?.ciudad      ?? "");
  const [direccion,   setDireccion]   = useState(sucursal?.direccion   ?? "");
  const [responsable, setResponsable] = useState(sucursal?.responsable ?? "");
  const [telefono,    setTelefono]    = useState(sucursal?.telefono    ?? "");
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const zona = zonas.find((z) => z.id === zonaId) ?? null;
    const campos = { nombre, zonaId: zonaId || null, ciudad, direccion, responsable, telefono };

    if (esEdicion) {
      const result = await editarSucursal({ sucursalId: sucursal!.id, ...campos });
      setLoading(false);
      if (!result.ok) { toast.error("Error", { description: result.error }); return; }
      onSaved({ ...sucursal!, nombre: nombre.trim(), ciudad, direccion, responsable, telefono, zonaId: zona?.id ?? null, zonaNombre: zona?.nombre ?? null });
      toast.success("Sucursal actualizada");
    } else {
      const result = await crearSucursal(campos);
      setLoading(false);
      if (!result.ok) { toast.error("Error", { description: result.error }); return; }
      onSaved({
        id: (result as { ok: true; id?: string }).id ?? crypto.randomUUID(),
        nombre: nombre.trim(), ciudad, direccion, responsable, telefono,
        activa: true, zonaId: zona?.id ?? null, zonaNombre: zona?.nombre ?? null,
      });
      toast.success("Sucursal creada");
    }
    onClose();
  }

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { required?: boolean; placeholder?: string; type?: string }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">
        {label}{!opts?.required && <span className="ml-1 text-text-tertiary">(opcional)</span>}
      </label>
      <input
        required={opts?.required}
        type={opts?.type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-primary p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          {esEdicion ? "Editar sucursal" : "Nueva sucursal"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {field("Nombre", nombre, setNombre, { required: true, placeholder: "Ej. Sabor Express Saltillo Centro" })}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Zona<span className="ml-1 text-text-tertiary">(opcional)</span></label>
            <select value={zonaId} onChange={(e) => setZonaId(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none">
              <option value="">Sin zona</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>

          {field("Ciudad", ciudad, setCiudad, { placeholder: "Ej. Saltillo" })}
          {field("Dirección", direccion, setDireccion, { placeholder: "Calle, número, colonia" })}
          {field("Responsable", responsable, setResponsable, { placeholder: "Nombre del encargado" })}
          {field("Teléfono", telefono, setTelefono, { placeholder: "Ej. 844 123 4567", type: "tel" })}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm text-text-secondary hover:bg-bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear sucursal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Sucursales ────────────────────────────────────────────

function TabSucursales({ sucursales: initialSucursales, zonas }: { sucursales: SucursalData[]; zonas: ZonaData[] }) {
  const [lista,      setLista]      = useState<SucursalData[]>(initialSucursales);
  const [loadingId,  setLoadingId]  = useState<string | null>(null);
  const [modalSuc,   setModalSuc]   = useState<SucursalData | null | "nueva">(null);

  const activas   = lista.filter((s) => s.activa).length;
  const inactivas = lista.filter((s) => !s.activa).length;

  async function handleToggle(sucId: string, activa: boolean) {
    setLoadingId(sucId);
    const result = await toggleActivaSucursal(sucId, activa);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setLista((prev) => prev.map((s) => s.id === sucId ? { ...s, activa } : s));
    toast.success(activa ? "Sucursal activada" : "Sucursal desactivada");
  }

  async function handleEliminar(sucId: string) {
    if (!confirm("¿Eliminar esta sucursal? Esta acción no se puede deshacer.")) return;
    setLoadingId(sucId);
    const result = await eliminarSucursal(sucId);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setLista((prev) => prev.filter((s) => s.id !== sucId));
    toast.success("Sucursal eliminada");
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* KPIs */}
        <div className="flex gap-3">
          {([["Activas", activas], ["Inactivas", inactivas], ["Total", lista.length]] as const).map(([l, v]) => (
            <div key={l} className="flex-1 rounded-xl border border-border bg-bg-primary p-4">
              <div className="text-xs text-text-tertiary">{l}</div>
              <div className="mt-1 text-2xl font-bold text-text-primary">{v}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-tertiary">{lista.length} sucursales registradas</span>
          <button onClick={() => setModalSuc("nueva")}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90">
            <Plus size={13} />
            Nueva sucursal
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-border bg-bg-primary">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 border-b border-border bg-bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span></span><span>Sucursal</span><span>Zona</span><span>Estado</span><span></span><span></span>
          </div>
          {lista.map((s, i) => {
            const busy = loadingId === s.id;
            return (
              <div key={s.id} className={cn(
                "grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3",
                i < lista.length - 1 && "border-b border-border",
                !s.activa && "opacity-50"
              )}>
                <div className={cn("h-2 w-2 shrink-0 rounded-full", s.activa ? "bg-status-ok-mid" : "bg-text-tertiary")} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-primary">{s.nombre}</div>
                  {s.ciudad && <div className="truncate text-xs text-text-tertiary">{s.ciudad}</div>}
                </div>
                <span className="text-xs text-text-secondary">
                  {s.zonaNombre ?? <span className="italic text-text-tertiary">Sin zona</span>}
                </span>
                {busy
                  ? <Loader2 size={14} className="animate-spin text-text-tertiary" />
                  : <Badge tone={s.activa ? "ok" : "gray"} size="sm">{s.activa ? "Activa" : "Inactiva"}</Badge>
                }
                <button disabled={busy} onClick={() => handleToggle(s.id, !s.activa)}
                  className="rounded px-2 py-1 text-[11px] text-text-tertiary hover:bg-bg-secondary disabled:opacity-50">
                  {s.activa ? "Desactivar" : "Activar"}
                </button>
                <div className="flex items-center gap-1">
                  <button disabled={busy} onClick={() => setModalSuc(s)} title="Editar"
                    className="rounded p-1 text-text-tertiary hover:bg-bg-secondary hover:text-brand-blue disabled:opacity-50">
                    <Pencil size={13} />
                  </button>
                  <button disabled={busy} onClick={() => handleEliminar(s.id)} title="Eliminar"
                    className="rounded p-1 text-text-tertiary hover:bg-status-danger-bg hover:text-status-danger disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalSuc !== null && (
        <SucursalModal
          sucursal={modalSuc === "nueva" ? null : modalSuc}
          zonas={zonas}
          onClose={() => setModalSuc(null)}
          onSaved={(s) => {
            setLista((prev) =>
              modalSuc === "nueva"
                ? [...prev, s]
                : prev.map((x) => x.id === s.id ? s : x)
            );
            setModalSuc(null);
          }}
        />
      )}
    </>
  );
}

// ── Tab: Zonas ─────────────────────────────────────────────────

function ZonaModal({
  zona,
  onClose,
  onSaved,
}: {
  zona:    ZonaData | null;
  onClose: () => void;
  onSaved: (z: ZonaData) => void;
}) {
  const esEdicion = !!zona;
  const [nombre,  setNombre]  = useState(zona?.nombre ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (esEdicion) {
      const result = await editarZona(zona!.id, nombre);
      setLoading(false);
      if (!result.ok) { toast.error("Error", { description: result.error }); return; }
      onSaved({ ...zona!, nombre: nombre.trim() });
      toast.success("Zona actualizada");
    } else {
      const result = await crearZona(nombre);
      setLoading(false);
      if (!result.ok) { toast.error("Error", { description: result.error }); return; }
      onSaved({ id: (result as { ok: true; id?: string }).id ?? crypto.randomUUID(), nombre: nombre.trim(), sucursalesCount: 0 });
      toast.success("Zona creada");
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-bg-primary p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          {esEdicion ? "Editar zona" : "Nueva zona"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Nombre de la zona</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Zona Norte"
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm text-text-secondary hover:bg-bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear zona"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabZonas({ zonas: initialZonas }: { zonas: ZonaData[] }) {
  const [lista,     setLista]     = useState<ZonaData[]>(initialZonas);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [modal,     setModal]     = useState<ZonaData | null | "nueva">(null);

  async function handleEliminar(zonaId: string, count: number) {
    if (count > 0) {
      toast.error("No se puede eliminar", { description: `Tiene ${count} sucursal(es) asignada(s). Reasígnalas primero.` });
      return;
    }
    if (!confirm("¿Eliminar esta zona? Esta acción no se puede deshacer.")) return;
    setLoadingId(zonaId);
    const result = await eliminarZona(zonaId);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setLista((prev) => prev.filter((z) => z.id !== zonaId));
    toast.success("Zona eliminada");
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-tertiary">{lista.length} zona{lista.length !== 1 ? "s" : ""} configurada{lista.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal("nueva")}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90">
            <Plus size={13} />
            Nueva zona
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-bg-primary">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border bg-bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span>Zona</span><span>Sucursales</span><span></span><span></span>
          </div>

          {lista.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">
              No hay zonas. Crea la primera para organizar tus sucursales.
            </div>
          )}

          {lista.map((z, i) => {
            const busy = loadingId === z.id;
            return (
              <div key={z.id} className={cn(
                "grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3",
                i < lista.length - 1 && "border-b border-border",
              )}>
                <div className="flex items-center gap-2">
                  <Layers size={14} className="shrink-0 text-brand-blue-mid" />
                  <span className="text-sm font-medium text-text-primary">{z.nombre}</span>
                </div>
                <span className="text-xs text-text-secondary">
                  {z.sucursalesCount} sucursal{z.sucursalesCount !== 1 ? "es" : ""}
                </span>
                {busy
                  ? <Loader2 size={14} className="animate-spin text-text-tertiary" />
                  : (
                    <button disabled={busy} onClick={() => setModal(z)} title="Editar"
                      className="rounded p-1 text-text-tertiary hover:bg-bg-secondary hover:text-brand-blue disabled:opacity-50">
                      <Pencil size={13} />
                    </button>
                  )
                }
                <button
                  disabled={busy}
                  onClick={() => handleEliminar(z.id, z.sucursalesCount)}
                  title={z.sucursalesCount > 0 ? "Tiene sucursales asignadas" : "Eliminar"}
                  className={cn(
                    "rounded p-1 disabled:opacity-50",
                    z.sucursalesCount > 0
                      ? "cursor-not-allowed text-text-tertiary opacity-40"
                      : "text-text-tertiary hover:bg-status-danger-bg hover:text-status-danger"
                  )}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-text-tertiary">
          Para eliminar una zona primero reasigna sus sucursales desde el tab <strong>Sucursales</strong>.
        </p>
      </div>

      {modal !== null && (
        <ZonaModal
          zona={modal === "nueva" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(z) => {
            setLista((prev) =>
              modal === "nueva"
                ? [...prev, z]
                : prev.map((x) => x.id === z.id ? { ...x, nombre: z.nombre } : x)
            );
            setModal(null);
          }}
        />
      )}
    </>
  );
}

// ── Modal: Invitar usuario ─────────────────────────────────────

// ── Modal: Editar usuario ──────────────────────────────────────

function EditarModal({
  usuario,
  sucursales,
  onClose,
  onSaved,
}: {
  usuario:    UsuarioData;
  sucursales: SucursalOpt[];
  onClose:    () => void;
  onSaved:    (u: UsuarioData) => void;
}) {
  const [nombre,     setNombre]     = useState(usuario.nombre);
  const [email,      setEmail]      = useState(usuario.email);
  const [rol,        setRol]        = useState(usuario.rol);
  const [sucursalId, setSucursalId] = useState(usuario.sucursal?.id ?? "");
  const [loading,    setLoading]    = useState(false);

  const rolRequiereSucursal = rol === "GERENTE_SUCURSAL" || rol === "TECNICO" || rol === "TRABAJADOR";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rolRequiereSucursal && !sucursalId) {
      toast.error("Selecciona una sucursal para este rol"); return;
    }
    setLoading(true);
    const result = await editarUsuario({
      usuarioId:  usuario.id,
      nombre,
      email,
      rol,
      sucursalId: rolRequiereSucursal ? sucursalId : null,
    });
    setLoading(false);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }

    const partes    = nombre.trim().split(/\s+/);
    const iniciales = partes.length >= 2
      ? ((partes[0]?.[0] ?? "") + (partes[partes.length - 1]?.[0] ?? "")).toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
    const suc = sucursales.find((s) => s.id === sucursalId) ?? null;

    onSaved({ ...usuario, nombre: nombre.trim(), iniciales, email, rol, sucursal: suc ? { id: suc.id, nombre: suc.nombre } : null });
    toast.success("Usuario actualizado");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-primary p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Editar usuario</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Nombre completo</label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Correo electrónico</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Rol</label>
            <select value={rol} onChange={(e) => { setRol(e.target.value); setSucursalId(""); }}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none">
              {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </div>
          {rolRequiereSucursal && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Sucursal</label>
              <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none">
                <option value="">Seleccionar sucursal…</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{shortenSucursal(s.nombre)}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-border px-4 text-sm text-text-secondary hover:bg-bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60">
              {loading && <Loader2 size={13} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvitarModal({
  sucursales,
  onClose,
  onCreated,
}: {
  sucursales: SucursalOpt[];
  onClose:   () => void;
  onCreated: (u: UsuarioData) => void;
}) {
  const [nombre,     setNombre]     = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [rol,        setRol]        = useState<string>("TECNICO");
  const [sucursalId, setSucursalId] = useState<string>("");
  const [loading,    setLoading]    = useState(false);

  const rolRequiereSucursal = rol === "GERENTE_SUCURSAL" || rol === "TECNICO" || rol === "TRABAJADOR";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password) return;
    if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (rolRequiereSucursal && !sucursalId) {
      toast.error("Selecciona una sucursal para este rol");
      return;
    }
    setLoading(true);
    const result = await invitarUsuario({
      nombre,
      email,
      password,
      rol,
      sucursalId: rolRequiereSucursal ? sucursalId : null,
    });
    setLoading(false);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }

    const partes    = nombre.trim().split(/\s+/);
    const iniciales = partes.length >= 2
      ? (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
    const suc = sucursales.find((s) => s.id === sucursalId) ?? null;

    onCreated({
      id:        crypto.randomUUID(),
      nombre:    nombre.trim(),
      iniciales,
      email,
      rol,
      activo:    true,
      sucursal:  suc ? { id: suc.id, nombre: suc.nombre } : null,
    });
    toast.success(`Usuario ${nombre.trim()} creado`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-primary p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Invitar usuario</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Nombre completo</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Juan Pérez García"
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Correo electrónico</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@saborexpress.mx"
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Contraseña temporal</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 8 caracteres"
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>

          {/* Rol */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Rol</label>
            <select
              value={rol}
              onChange={(e) => { setRol(e.target.value); setSucursalId(""); }}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABEL[r]}</option>
              ))}
            </select>
          </div>

          {/* Sucursal — solo si el rol la requiere */}
          {rolRequiereSucursal && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Sucursal</label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary focus:border-brand-blue focus:outline-none"
              >
                <option value="">Seleccionar sucursal…</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{shortenSucursal(s.nombre)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-border px-4 text-sm text-text-secondary hover:bg-bg-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Usuarios ──────────────────────────────────────────────

function TabUsuarios({
  initialUsuarios,
  sucursalesOpts,
}: {
  initialUsuarios: UsuarioData[];
  sucursalesOpts:  SucursalOpt[];
}) {
  const [usuarios,     setUsuarios]     = useState<UsuarioData[]>(initialUsuarios);
  const [modalInvitar, setModalInvitar] = useState(false);
  const [modalEditar,  setModalEditar]  = useState<UsuarioData | null>(null);
  const [loadingId,    setLoadingId]    = useState<string | null>(null);

  async function handleRol(userId: string, rol: string) {
    setLoadingId(userId);
    const result = await cambiarRolUsuario(userId, rol);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setUsuarios((prev) => prev.map((u) => u.id === userId ? { ...u, rol } : u));
    toast.success("Rol actualizado");
  }

  async function handleToggle(userId: string, activo: boolean) {
    setLoadingId(userId);
    const result = await toggleActivoUsuario(userId, activo);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setUsuarios((prev) => prev.map((u) => u.id === userId ? { ...u, activo } : u));
    toast.success(activo ? "Usuario activado" : "Usuario desactivado");
  }

  async function handleEliminar(userId: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setLoadingId(userId);
    const result = await eliminarUsuario(userId);
    setLoadingId(null);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    setUsuarios((prev) => prev.filter((u) => u.id !== userId));
    toast.success("Usuario eliminado");
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-tertiary">
            {usuarios.filter((u) => u.activo).length} activos · {usuarios.length} en total
          </span>
          <button
            onClick={() => setModalInvitar(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            <Plus size={13} />
            Invitar usuario
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-bg-primary">
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 border-b border-border bg-bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span>Usuario</span>
            <span>Rol</span>
            <span>Sucursal</span>
            <span>Estado</span>
            <span></span>
            <span></span>
          </div>

          {usuarios.map((u, i) => {
            const busy = loadingId === u.id;
            return (
              <div
                key={u.id}
                className={cn(
                  "grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3",
                  i < usuarios.length - 1 && "border-b border-border",
                  !u.activo && "opacity-50"
                )}
              >
                {/* Avatar + info */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-bold text-brand-blue">
                    {u.iniciales}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-text-primary">{u.nombre}</div>
                    <div className="truncate font-mono text-[10px] text-text-tertiary">{u.email}</div>
                  </div>
                </div>

                {/* Rol select */}
                <select
                  value={u.rol}
                  disabled={busy}
                  onChange={(e) => handleRol(u.id, e.target.value)}
                  className="h-7 rounded-md border border-border bg-bg-secondary px-2 text-[11px] text-text-primary focus:border-brand-blue focus:outline-none disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROL_LABEL[r]}</option>
                  ))}
                </select>

                {/* Sucursal */}
                <span className="w-24 truncate text-xs text-text-secondary">
                  {u.sucursal ? shortenSucursal(u.sucursal.nombre) : <span className="italic text-text-tertiary">Todas</span>}
                </span>

                {/* Estado icon */}
                {busy ? (
                  <Loader2 size={15} className="animate-spin text-text-tertiary" />
                ) : u.activo ? (
                  <CheckCircle2 size={15} className="text-status-ok-mid" />
                ) : (
                  <XCircle size={15} className="text-status-danger-mid" />
                )}

                {/* Toggle + Edit + Delete */}
                <button
                  disabled={busy}
                  onClick={() => handleToggle(u.id, !u.activo)}
                  className="rounded px-2 py-1 text-[11px] text-text-tertiary hover:bg-bg-secondary disabled:opacity-50"
                >
                  {u.activo ? "Desactivar" : "Activar"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    disabled={busy}
                    onClick={() => setModalEditar(u)}
                    title="Editar usuario"
                    className="rounded p-1 text-text-tertiary hover:bg-bg-secondary hover:text-brand-blue disabled:opacity-50"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleEliminar(u.id)}
                    title="Eliminar usuario"
                    className="rounded p-1 text-text-tertiary hover:bg-status-danger-bg hover:text-status-danger disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalInvitar && (
        <InvitarModal
          sucursales={sucursalesOpts}
          onClose={() => setModalInvitar(false)}
          onCreated={(u) => setUsuarios((prev) => [...prev, u])}
        />
      )}

      {modalEditar && (
        <EditarModal
          usuario={modalEditar}
          sucursales={sucursalesOpts}
          onClose={() => setModalEditar(null)}
          onSaved={(u) => setUsuarios((prev) => prev.map((x) => x.id === u.id ? u : x))}
        />
      )}
    </>
  );
}

// ── Tab: Parámetros ────────────────────────────────────────────

function TabParametros() {
  const params = [
    { grupo: "Preventivos", items: [
      { label: "Días previos para estado «Próximo»",    value: "7 días"  },
      { label: "Umbral «Vencido» (días de tolerancia)", value: "0 días"  },
      { label: "Frecuencia de revisión automática",     value: "Diaria"  },
    ]},
    { grupo: "Órdenes de trabajo", items: [
      { label: "Prioridad por defecto en nueva OT",     value: "MEDIA"    },
      { label: "SLA OT Correctiva — Alta prioridad",    value: "4 horas"  },
      { label: "SLA OT Correctiva — Media prioridad",   value: "24 horas" },
      { label: "SLA OT Preventiva",                     value: "48 horas" },
    ]},
    { grupo: "Inventario", items: [
      { label: "Alerta de stock bajo al alcanzar",         value: "Stock mínimo por refacción" },
      { label: "Retención de historial de movimientos",    value: "24 meses"                  },
    ]},
  ];

  return (
    <div className="flex flex-col gap-4">
      {params.map((grupo) => (
        <div key={grupo.grupo} className="overflow-hidden rounded-xl border border-border bg-bg-primary">
          <div className="border-b border-border bg-bg-secondary px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{grupo.grupo}</span>
          </div>
          <div className="px-4">
            {grupo.items.map((item) => (
              <SectionRow
                key={item.label}
                label={item.label}
                value={<span className="flex items-center gap-2"><span>{item.value}</span><Pendiente /></span>}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Notificaciones ────────────────────────────────────────

function TabNotificaciones() {
  const notifs = [
    { label: "OT sin técnico asignado después de 24 h",  canal: "Correo"    },
    { label: "PM vencido sin completar",                  canal: "Correo"    },
    { label: "Equipo cambia a estado FALLA",              canal: "Correo"    },
    { label: "Incidencia reportada — severidad ALTA",     canal: "Correo"    },
    { label: "Stock de refacción llega a mínimo",         canal: "Correo"    },
    { label: "Resumen diario de operaciones (07:00)",     canal: "Correo"    },
    { label: "Alertas WhatsApp — OT crítica",             canal: "WhatsApp"  },
    { label: "Alertas WhatsApp — equipo en FALLA",        canal: "WhatsApp"  },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-status-warn/30 bg-status-warn-bg px-4 py-3">
        <p className="text-xs text-status-warn">
          El sistema de notificaciones automáticas está en desarrollo. Por ahora las alertas son visibles dentro de la plataforma en la sección <strong>Alertas activas</strong>.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-primary">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          <span>Notificación</span><span>Canal</span><span>Estado</span>
        </div>
        {notifs.map((n, i) => (
          <div key={i} className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3", i < notifs.length - 1 && "border-b border-border")}>
            <span className="text-xs text-text-secondary">{n.label}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", n.canal === "WhatsApp" ? "bg-status-ok-bg text-status-ok" : "bg-status-info-bg text-status-info")}>
              {n.canal}
            </span>
            <button disabled className="flex h-5 w-9 items-center rounded-full bg-bg-tertiary px-0.5 opacity-50" title="Próximamente">
              <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2">
        <Pendiente />
        <span className="text-xs text-text-tertiary">Configuración de canales (correo, WhatsApp) disponible en la siguiente versión.</span>
      </div>
    </div>
  );
}

// ── Tab: Mi contraseña ─────────────────────────────────────────

function TabMiCuenta() {
  const { data: session } = useSession();
  const [actual,   setActual]   = useState("");
  const [nueva,    setNueva]    = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) { toast.error("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    if (nueva !== confirma) { toast.error("Las contraseñas no coinciden"); return; }
    if (!session?.user?.id) return;
    setLoading(true);
    const result = await cambiarPassword(session.user.id, actual, nueva);
    setLoading(false);
    if (!result.ok) { toast.error("Error", { description: result.error }); return; }
    toast.success("Contraseña actualizada correctamente");
    setActual(""); setNueva(""); setConfirma("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-bg-primary p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-primary">Cambiar contraseña</h3>
        <p className="mb-4 text-xs text-text-tertiary">La nueva contraseña debe tener al menos 8 caracteres.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Contraseña actual</label>
            <input
              required type="password" value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Nueva contraseña</label>
            <input
              required type="password" value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mín. 8 caracteres"
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Confirmar nueva contraseña</label>
            <input
              required type="password" value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit" disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Guardar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

export function ConfiguracionClient({
  empresa,
  sucursales,
  usuarios,
  sucursalesOpts,
  zonas,
}: ConfiguracionClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("empresa");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Configuración del sistema</h1>
        <p className="text-sm text-text-tertiary">Empresa, sucursales, usuarios y parámetros de ManteniPro.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-bg-primary p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-brand-blue-light text-brand-blue"
                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "empresa"        && <TabEmpresa empresa={empresa} total={usuarios.length} />}
        {activeTab === "sucursales"     && <TabSucursales sucursales={sucursales} zonas={zonas} />}
        {activeTab === "zonas"          && <TabZonas zonas={zonas} />}
        {activeTab === "usuarios"       && <TabUsuarios initialUsuarios={usuarios} sucursalesOpts={sucursalesOpts} />}
        {activeTab === "parametros"     && <TabParametros />}
        {activeTab === "notificaciones" && <TabNotificaciones />}
        {activeTab === "micuenta"       && <TabMiCuenta />}
      </div>
    </div>
  );
}
