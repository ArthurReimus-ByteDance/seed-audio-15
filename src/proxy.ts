import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, hasValidSession } from "@/lib/access/token";

const PUBLIC_PATHS = ["/login", "/api/auth"];

const NOT_CONFIGURED = "Access is locked: set STUDIO_ACCESS_CODE for this deployment (or STUDIO_ALLOW_OPEN=true to serve without a password).";

function requiresCode(): boolean {
  return process.env.NODE_ENV === "production" && process.env.STUDIO_ALLOW_OPEN !== "true";
}

export async function proxy(request: NextRequest) {
  const code = process.env.STUDIO_ACCESS_CODE;
  const { pathname } = request.nextUrl;
  if (!code) {
    if (!requiresCode()) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 503 });
    return new NextResponse(NOT_CONFIGURED, { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return NextResponse.next();
  if (await hasValidSession(request.cookies.get(ACCESS_COOKIE)?.value, code)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.svg|favicon.ico).*)"],
};
