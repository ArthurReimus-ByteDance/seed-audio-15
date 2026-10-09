import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, accessToken, isValidCode } from "@/lib/access/token";
import { getServerEnv } from "@/server/env";

const bodySchema = z.object({ code: z.string().min(1).max(256) });
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const { accessCode } = getServerEnv();
  if (!accessCode) return NextResponse.json({ ok: true, required: false });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(await isValidCode(parsed.data.code, accessCode))) {
    return NextResponse.json({ error: "That access code is not valid" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, required: true });
  response.cookies.set(ACCESS_COOKIE, await accessToken(accessCode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
