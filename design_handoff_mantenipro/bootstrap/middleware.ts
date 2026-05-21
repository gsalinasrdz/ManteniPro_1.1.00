import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;

  // Rutas públicas
  const publicRoutes = ["/login", "/api/auth"];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  if (!isAuthed && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
