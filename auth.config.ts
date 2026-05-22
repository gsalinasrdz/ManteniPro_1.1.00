import type { NextAuthConfig } from "next-auth";

// Rutas permitidas por rol (prefijos). Vacío = sin restricciones.
const ALLOWED: Record<string, string[]> = {
  TECNICO:  ["/", "/incidencias", "/ordenes", "/calendario", "/historial", "/api"],
  TRABAJADOR: ["/incidencias", "/api"],
};

// Edge-safe config — sin Prisma, sin bcrypt
// Usada por el middleware; lib/auth.ts la extiende con el adapter y providers completos
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.rol = token.rol as string;
        session.user.sucursalId = token.sucursalId as string | null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isAuthed = !!auth;
      const { pathname } = nextUrl;
      const isPublic =
        pathname.startsWith("/login") || pathname.startsWith("/api/auth");

      if (!isAuthed && !isPublic) return false;

      if (isAuthed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rol = (auth as any)?.user?.rol as string | undefined;

        // TRABAJADOR: redirigir desde /login y rutas no permitidas
        if (rol === "TRABAJADOR") {
          if (pathname === "/login") return Response.redirect(new URL("/incidencias", nextUrl));
          const cocineroRoutes = ALLOWED["TRABAJADOR"] ?? [];
          const ok = cocineroRoutes.some((p) =>
            p === "/" ? pathname === "/" : pathname.startsWith(p)
          );
          if (!ok) return Response.redirect(new URL("/incidencias", nextUrl));
        }

        // TECNICO: redirigir desde rutas no permitidas
        if (rol === "TECNICO") {
          if (pathname === "/login") return Response.redirect(new URL("/", nextUrl));
          const tecnicoRoutes = ALLOWED["TECNICO"] ?? [];
          const ok = tecnicoRoutes.some((p) =>
            p === "/" ? pathname === "/" : pathname.startsWith(p)
          );
          if (!ok) return Response.redirect(new URL("/", nextUrl));
        }

        // Otros roles: solo redirigir desde /login al home
        if (pathname === "/login") return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
