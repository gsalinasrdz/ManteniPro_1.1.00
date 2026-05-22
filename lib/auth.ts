import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const usuario = await db.usuario.findUnique({
          where: { email: parsed.data.email },
          include: { sucursal: true, empresa: true },
        });
        if (!usuario || !usuario.activo) return null;
        if (!usuario.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
        if (!valid) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          image: usuario.imagen,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const usuario = await db.usuario.findUnique({
          where: { id: user.id },
          include: { sucursal: true },
        });
        if (usuario) {
          token.rol = usuario.rol;
          token.sucursalId = usuario.sucursalId;
          token.empresaId = usuario.empresaId;
          token.iniciales = usuario.iniciales;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.rol = token.rol as string;
        session.user.sucursalId = token.sucursalId as string | null;
        session.user.empresaId = token.empresaId as string;
        session.user.iniciales = token.iniciales as string;
      }
      return session;
    },
  },
});
