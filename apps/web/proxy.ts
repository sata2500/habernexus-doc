import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Optimistik cookie kontrolü (Edge uyumlu, hızlı)
  const sessionCookie = getSessionCookie(request);

  // Oturum yoksa giriş sayfasına yönlendir
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Rol gerektiren rotalar için tam session doğrulaması
  // Not: Bunlar header'ları gerektirir, layout düzeyinde ikinci hat kontrolü yapılır.
  // Middleware'de cookie varlığı yeterli; rol kontrolü Layout/Sunucu tarafında.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/author/:path*",
    "/admin/:path*",
  ],
};
