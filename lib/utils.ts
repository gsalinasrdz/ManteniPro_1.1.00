import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenSucursal(nombre: string): string {
  return nombre
    .replace(/^sucursal\s+/i, "")
    .replace(/^dark kitchen\s+/i, "DK ")
    .replace(/^plaza\s+/i, "")
    .trim();
}
