import { describe, expect, it } from "vitest";
import { assertPublicHost, checkUrlShape, isPrivateAddress, UnsafeUrlError } from "./url-guard";

describe("isPrivateAddress", () => {
  it.each([
    "0.0.0.0", "10.1.2.3", "127.0.0.1", "127.255.255.255", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "100.64.0.1", "100.127.255.255", "224.0.0.1", "255.255.255.255",
    "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a00:1", "[::1]",
    "not-an-ip", "",
  ])("treats %j as private", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "::ffff:808:808"])(
    "treats %j as public",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe("checkUrlShape", () => {
  const strict = { allowLocalhost: false };

  it("accepts https and rejects http, other schemes and credentials", () => {
    expect(() => checkUrlShape(new URL("https://media.example.com/v.mp4"), strict)).not.toThrow();
    for (const bad of ["http://media.example.com/v.mp4", "ftp://x.test/v.mp4", "file:///etc/passwd", "https://u:p@media.example.com/v.mp4"]) {
      expect(() => checkUrlShape(new URL(bad), strict), bad).toThrow(UnsafeUrlError);
    }
  });

  it("allows plain http only for localhost when explicitly enabled", () => {
    expect(() => checkUrlShape(new URL("http://localhost:4000/v.mp4"), { allowLocalhost: true })).not.toThrow();
    expect(() => checkUrlShape(new URL("http://localhost:4000/v.mp4"), strict)).toThrow(UnsafeUrlError);
    expect(() => checkUrlShape(new URL("http://media.example.com/v.mp4"), { allowLocalhost: true })).toThrow(UnsafeUrlError);
  });
});

describe("assertPublicHost", () => {
  const strict = { allowLocalhost: false };

  it("rejects private IP literals and internal names without any lookup", async () => {
    for (const host of ["127.0.0.1", "169.254.169.254", "10.0.0.5", "[::1]", "localhost", "db.internal", "printer.local", "app.localhost"]) {
      await expect(assertPublicHost(host, strict), host).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it("accepts a public IP literal and allows localhost only when enabled", async () => {
    await expect(assertPublicHost("8.8.8.8", strict)).resolves.toBeUndefined();
    await expect(assertPublicHost("localhost", { allowLocalhost: true })).resolves.toBeUndefined();
  });

  it("rejects hosts that cannot be resolved", async () => {
    await expect(assertPublicHost("this-host-does-not-exist.invalid", strict)).rejects.toThrow(/could not be resolved/);
  });
});
