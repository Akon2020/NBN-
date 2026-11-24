import { NextResponse, type NextRequest } from "next/server"

// Cause de « Serveur injoignable » sur iPhone : le site répondait aussi en
// http://, Safari ne force pas HTTPS pour ce domaine, et l'API refuse une
// page `http://` (origine non autorisée, cookies `Secure`). Toute visite en
// HTTP est donc renvoyée vers HTTPS. Le reverse proxy du cPanel transmet le
// protocole d'origine dans `x-forwarded-proto`.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

export function proxy(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""

  if (forwardedProto === "http" && host && !LOCAL_HOST.test(host)) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${host}`)
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
}
