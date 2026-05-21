import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });

export const fmtDate = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

export const daysUntil = (d: Date | string, today: Date = new Date()) => {
  const target = typeof d === "string" ? new Date(d) : d;
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const shortenSucursal = (nombre: string) =>
  nombre.replace("Sucursal ", "").replace("Dark Kitchen ", "DK ");
