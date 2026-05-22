"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-tertiary">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue text-xl font-bold text-white">
            MP
          </div>
          <h1 className="text-xl font-semibold text-text-primary">ManteniPro</h1>
          <p className="mt-1 text-sm text-text-secondary">Gestión de mantenimiento industrial</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-bg-primary p-6 shadow-sm">
          <h2 className="mb-5 text-md font-semibold text-text-primary">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-4 rounded-lg bg-bg-secondary px-3 py-2">
            <p className="text-xs text-text-tertiary font-medium mb-1">Demo — ingresa con:</p>
            <p className="text-xs text-text-secondary">maria.gonzalez@saborexpress.mx</p>
            <p className="text-xs text-text-secondary">carlos.vega@saborexpress.mx</p>
          </div>
        </div>
      </div>
    </div>
  );
}
