import { NextRequest, NextResponse } from "next/server"

const publicPaths = ["/login"]
const publicApiPrefixes = ["/api/auth/login", "/api/auth/logout"]
const adminPaths = ["/admin"]
const adminApiPrefixes = ["/api/admin"]

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (path.startsWith("/_next") || path.startsWith("/favicon") || path === "/") {
    return NextResponse.next()
  }

  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  if (publicApiPrefixes.some((p) => path.startsWith(p))) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
