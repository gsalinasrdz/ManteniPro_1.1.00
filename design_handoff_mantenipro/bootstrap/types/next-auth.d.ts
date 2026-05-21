import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      rol: string;
      sucursalId: string | null;
      empresaId: string;
      iniciales: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: string;
    sucursalId?: string | null;
    empresaId?: string;
    iniciales?: string;
  }
}
