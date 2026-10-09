import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, hasValidSession } from "@/lib/access/token";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function proxy(request: NextRequest) {
  const code = process.env.STUDIO_ACCESS_CODE;
  if (!code) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return NextResponse.next();
  if (await hasValidSession(request.cookies.get(ACCESS_COOKIE)?.value, code)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
