import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConfiguracionClient } from "@/components/views/configuracion/configuracion-client";

export default async function ConfiguracionPage() {
  const session    = await auth();
  const { empresaId } = session!.user;

  const [empresa, sucursales, usuarios, zonas] = await Promise.all([
    db.empresa.findUnique({
      where:  { id: empresaId },
      select: { nombre: true, rfc: true, marca: true },
    }),
    db.sucursal.findMany({
      where:   { empresaId },
      select:  { id: true, nombre: true, formato: true, activa: true, zonaId: true, zona: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    db.usuario.findMany({
      where:   { empresaId },
      select: {
        id: true, nombre: true, iniciales: true, email: true,
        rol: true, activo: true,
        sucursal: { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    db.zona.findMany({
      where:   { empresaId },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <ConfiguracionClient
      empresa={{
        nombre:   empresa?.nombre ?? "",
        rfc:      empresa?.rfc    ?? "",
        concepto: empresa?.marca  ?? "",
      }}
      sucursales={sucursales.map((s) => ({
        id:       s.id,
        nombre:   s.nombre,
        formato:  s.formato,
        activa:   s.activa,
        zonaId:   s.zonaId,
        zonaNombre: s.zona?.nombre ?? null,
      }))}
      usuarios={usuarios.map((u) => ({
        id:         u.id,
        nombre:     u.nombre,
        iniciales:  u.iniciales,
        email:      u.email,
        rol:        u.rol,
        activo:     u.activo,
        sucursal:   u.sucursal ? { id: u.sucursal.id, nombre: u.sucursal.nombre } : null,
      }))}
      sucursalesOpts={sucursales
        .filter((s) => s.activa)
        .map((s) => ({ id: s.id, nombre: s.nombre }))}
      zonas={zonas}
    />
  );
}
