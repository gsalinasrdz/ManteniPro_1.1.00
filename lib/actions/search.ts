"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SearchResult = {
  tipo:     "ot" | "incidencia" | "equipo";
  id:       string;
  numero:   string;
  titulo:   string;
  subtitulo?: string;
};

export async function searchGlobal(q: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user) return [];

  const { empresaId } = session.user;
  const term = q.trim().slice(0, 60);
  if (!term) return [];

  const equipoWhere = { sucursal: { empresaId } };

  const [ots, incidencias, equipos] = await Promise.all([
    db.ordenTrabajo.findMany({
      where: {
        equipo: equipoWhere,
        OR: [
          { numero: { contains: term, mode: "insensitive" } },
          { titulo:  { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true, numero: true, titulo: true,
        equipo: { select: { sucursal: { select: { nombre: true } } } },
      },
    }),
    db.incidencia.findMany({
      where: {
        equipo: equipoWhere,
        OR: [
          { numero: { contains: term, mode: "insensitive" } },
          { titulo:  { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true, numero: true, titulo: true,
        equipo: { select: { sucursal: { select: { nombre: true } } } },
      },
    }),
    db.equipo.findMany({
      where: {
        sucursal: { empresaId },
        OR: [
          { cu:   { contains: term, mode: "insensitive" } },
          { tipo: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true, cu: true, tipo: true,
        sucursal: { select: { nombre: true } },
      },
    }),
  ]);

  return [
    ...ots.map((o) => ({
      tipo:      "ot" as const,
      id:        o.id,
      numero:    o.numero,
      titulo:    o.titulo,
      subtitulo: o.equipo.sucursal.nombre,
    })),
    ...incidencias.map((i) => ({
      tipo:      "incidencia" as const,
      id:        i.id,
      numero:    i.numero,
      titulo:    i.titulo,
      subtitulo: i.equipo.sucursal.nombre,
    })),
    ...equipos.map((e) => ({
      tipo:      "equipo" as const,
      id:        e.id,
      numero:    e.cu,
      titulo:    e.tipo,
      subtitulo: e.sucursal.nombre,
    })),
  ];
}
