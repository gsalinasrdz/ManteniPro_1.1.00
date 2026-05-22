"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalFiltersState {
  zonaId:       string | null;
  sucursalId:   string | null;
  setZonaId:    (id: string | null) => void;
  setSucursalId:(id: string | null) => void;
  reset:        () => void;
}

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      zonaId:        null,
      sucursalId:    null,
      setZonaId:     (id) => set({ zonaId: id, sucursalId: null }),
      setSucursalId: (id) => set({ sucursalId: id }),
      reset:         () => set({ zonaId: null, sucursalId: null }),
    }),
    { name: "mantenipro:filters" }
  )
);
