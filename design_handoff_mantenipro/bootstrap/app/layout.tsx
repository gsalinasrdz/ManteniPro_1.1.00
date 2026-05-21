import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ManteniPro",
  description: "Gestión de mantenimiento industrial multi-sucursal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
