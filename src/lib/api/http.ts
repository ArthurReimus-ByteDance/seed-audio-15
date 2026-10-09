import axios, { isAxiosError, isCancel } from "axios";

export const http = axios.create({ baseURL: "/api", timeout: 0 });

export class RequestCancelled extends Error {
  constructor() {
    super("Request cancelled");
    this.name = "RequestCancelled";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof RequestCancelled || isCancel(error)) return "Request cancelled";
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === "string") return data.error;
    if (error.response) return `Request failed (${error.response.status})`;
    return "Network error: could not reach the server";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
