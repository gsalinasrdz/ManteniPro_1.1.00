"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Rol } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function cambiarRolUsuario(
  usuarioId: string,
  rol: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  try {
    await db.usuario.update({
      where: { id: usuarioId },
      data:  { rol: rol as Rol },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al cambiar rol" };
  }
}

export async function toggleActivoUsuario(
  usuarioId: string,
  activo: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };
  if (usuarioId === session.user.id)
    return { ok: false, error: "No puedes desactivarte a ti mismo" };

  try {
    await db.usuario.update({
      where: { id: usuarioId },
      data:  { activo },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar usuario" };
  }
}

export async function cambiarPassword(
  usuarioId: string,
  passwordActual: string,
  passwordNueva: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.id !== usuarioId) return { ok: false, error: "Sin permiso" };

  try {
    const usuario = await db.usuario.findUnique({ where: { id: usuarioId }, select: { passwordHash: true } });
    if (!usuario?.passwordHash) return { ok: false, error: "Usuario sin contraseña configurada" };

    const valid = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!valid) return { ok: false, error: "Contraseña actual incorrecta" };

    const hash = await bcrypt.hash(passwordNueva, 12);
    await db.usuario.update({ where: { id: usuarioId }, data: { passwordHash: hash } });
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al cambiar contraseña" };
  }
}

export async function editarUsuario(input: {
  usuarioId:  string;
  nombre:     string;
  email:      string;
  rol:        string;
  sucursalId: string | null;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  const partes    = input.nombre.trim().split(/\s+/);
  const first     = partes[0] ?? "";
  const last      = partes[partes.length - 1] ?? "";
  const iniciales = partes.length >= 2
    ? ((first[0] ?? "") + (last[0] ?? "")).toUpperCase()
    : input.nombre.slice(0, 2).toUpperCase();

  try {
    const dup = await db.usuario.findFirst({
      where: { email: input.email, NOT: { id: input.usuarioId } },
    });
    if (dup) return { ok: false, error: "Ese correo ya está en uso" };

    await db.usuario.update({
      where: { id: input.usuarioId },
      data: {
        nombre:     input.nombre.trim(),
        iniciales,
        email:      input.email,
        rol:        input.rol as Rol,
        sucursalId: input.sucursalId || null,
      },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al editar usuario" };
  }
}

export async function eliminarUsuario(usuarioId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };
  if (usuarioId === session.user.id)
    return { ok: false, error: "No puedes eliminarte a ti mismo" };

  try {
    await db.usuario.delete({ where: { id: usuarioId } });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar usuario" };
  }
}

export async function invitarUsuario(input: {
  nombre:     string;
  email:      string;
  password:   string;
  rol:        string;
  sucursalId: string | null;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.user.rol !== "GERENTE_OPERACIONES")
    return { ok: false, error: "Sin permiso" };

  const { empresaId } = session.user;

  // Derive initials from nombre
  const partes    = input.nombre.trim().split(/\s+/);
  const first     = partes[0] ?? "";
  const last      = partes[partes.length - 1] ?? "";
  const iniciales = partes.length >= 2
    ? ((first[0] ?? "") + (last[0] ?? "")).toUpperCase()
    : input.nombre.slice(0, 2).toUpperCase();

  try {
    const existing = await db.usuario.findUnique({ where: { email: input.email } });
    if (existing) return { ok: false, error: "Ya existe un usuario con ese correo" };

    const passwordHash = await bcrypt.hash(input.password, 12);

    await db.usuario.create({
      data: {
        empresaId,
        email:        input.email,
        nombre:       input.nombre.trim(),
        iniciales,
        rol:          input.rol as Rol,
        sucursalId:   input.sucursalId || null,
        activo:       true,
        passwordHash,
      },
    });
    revalidatePath("/configuracion");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al crear usuario" };
  }
}
