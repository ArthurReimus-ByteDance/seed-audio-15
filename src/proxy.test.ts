import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE, accessToken } from "@/lib/access/token";
import { config, proxy } from "./proxy";

const request = (path: string, cookie?: string) => new NextRequest(`https://studio.example.com${path}`, cookie ? { headers: { cookie: `${ACCESS_COOKIE}=${cookie}` } } : undefined);
const configure = (env: Record<string, string>) => Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));

afterEach(() => vi.unstubAllEnvs());

describe("access gate with a password", () => {
  it("redirects pages to the login page and keeps the requested path", async () => {
    configure({ STUDIO_ACCESS_CODE: "open-sesame", NODE_ENV: "production" });
    const response = await proxy(request("/studio/text-to-audio"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") as string);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/studio/text-to-audio");
  });

  it("answers API calls without a session with 401", async () => {
    configure({ STUDIO_ACCESS_CODE: "open-sesame", NODE_ENV: "production" });
    for (const path of ["/api/generate", "/api/status", "/api/mux", "/api/audio?src=x"]) {
      expect((await proxy(request(path))).status).toBe(401);
    }
  });

  it("rejects a wrong or stale session cookie", async () => {
    configure({ STUDIO_ACCESS_CODE: "open-sesame", NODE_ENV: "production" });
    expect((await proxy(request("/", "nope"))).status).toBe(307);
    expect((await proxy(request("/api/status", await accessToken("another-password")))).status).toBe(401);
  });

  it("lets a valid session through and leaves the login routes public", async () => {
    configure({ STUDIO_ACCESS_CODE: "open-sesame", NODE_ENV: "production" });
    const cookie = await accessToken("open-sesame");
    expect((await proxy(request("/api/status", cookie))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(request("/login"))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(request("/api/auth"))).headers.get("x-middleware-next")).toBe("1");
  });
});

describe("access gate without a password", () => {
  it("locks every page and API route in production", async () => {
    configure({ NODE_ENV: "production" });
    const page = await proxy(request("/"));
    expect(page.status).toBe(503);
    expect(await page.text()).toContain("STUDIO_ACCESS_CODE");
    expect((await proxy(request("/api/generate"))).status).toBe(503);
    expect((await proxy(request("/login"))).status).toBe(503);
  });

  it("treats an empty password as not set", async () => {
    configure({ NODE_ENV: "production", STUDIO_ACCESS_CODE: "" });
    expect((await proxy(request("/"))).status).toBe(503);
  });

  it("serves openly in production only when explicitly allowed", async () => {
    configure({ NODE_ENV: "production", STUDIO_ALLOW_OPEN: "true" });
    expect((await proxy(request("/"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("stays open during local development", async () => {
    configure({ NODE_ENV: "development" });
    expect((await proxy(request("/"))).headers.get("x-middleware-next")).toBe("1");
  });
});

describe("gate matcher", () => {
  const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

  it("covers pages and API routes", () => {
    for (const path of ["/", "/studio/text-to-audio", "/api/generate", "/login"]) expect(matches(path)).toBe(true);
  });

  it("leaves static assets public so the login page can show the logo", () => {
    for (const path of ["/brand/byteplus-logo.png", "/brand/byteplus-logo-dark.png", "/icon.svg", "/favicon.ico", "/_next/static/chunks/a.js"]) expect(matches(path)).toBe(false);
  });
});
