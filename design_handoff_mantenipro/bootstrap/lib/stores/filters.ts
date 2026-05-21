"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalFiltersState {
  sucursalId: string | null;
  setSucursalId: (id: string | null) => void;
  reset: () => void;
}

/**
 * Filtro global de sucursal compartido entre todas las vistas operativas.
 * Persiste en localStorage para que el filtro sobreviva navegación entre rutas.
 */
export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      sucursalId: null,
      setSucursalId: (id) => set({ sucursalId: id }),
      reset: () => set({ sucursalId: null }),
    }),
    { name: "mantenipro:filters" }
  )
);
