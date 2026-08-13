import { NextRequest, NextResponse } from "next/server"

export const PUBLIC_PATHS = ["/login", "/planes", "/pricing", "/"]
export const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/callback",
  "/api/auth/request",
  "/api/webhooks/stripe",
]

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))
}

export function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => path.startsWith(p))
}

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (path.startsWith("/_next") || path.startsWith("/favicon")) {
    return NextResponse.next()
  }

  if (isPublicPath(path) || isPublicApiPath(path)) {
    return NextResponse.next()
  }

  const sessionId = req.cookies.get("session_id")?.value

  if (!sessionId) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.ico/).*)"],
}
