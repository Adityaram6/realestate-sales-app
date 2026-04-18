import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { mockHandlers, type MockHandler } from "@/mocks/handlers";

/**
 * Lightweight axios mock adapter. Matches requests against the handler list
 * and returns in-memory fixture data. Lets us build the UI before the NestJS
 * backend exists, and keeps the real API swap as flipping NEXT_PUBLIC_USE_MOCK.
 */
export function installMockAdapter(client: AxiosInstance) {
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? "get").toLowerCase();
    const url = (config.url ?? "").replace(config.baseURL ?? "", "");

    const handler = findHandler(method, url);
    if (!handler) {
      return {
        data: { message: `Mock handler not found: ${method.toUpperCase()} ${url}` },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config,
      };
    }

    const body = parseBody(config.data);
    await delay(150 + Math.random() * 200);

    try {
      const result = await handler.handler({
        params: handler.params,
        body,
        query: parseQuery(config.params),
      });
      return {
        data: result.data,
        status: result.status ?? 200,
        statusText: "OK",
        headers: {},
        config,
      };
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      const message = err instanceof Error ? err.message : "Mock error";
      return {
        data: { message, statusCode: status },
        status,
        statusText: "Error",
        headers: {},
        config,
      };
    }
  };
}

function findHandler(method: string, path: string):
  | (MockHandler & { params: Record<string, string> })
  | null {
  const pathOnly = path.split("?")[0] ?? "";
  for (const h of mockHandlers) {
    if (h.method !== method) continue;
    const match = matchRoute(h.path, pathOnly);
    if (match) return { ...h, params: match };
  }
  return null;
}

function matchRoute(
  pattern: string,
  actual: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const actualParts = actual.split("/").filter(Boolean);
  if (patternParts.length !== actualParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]!;
    const a = actualParts[i]!;
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

function parseBody(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function parseQuery(params: unknown): Record<string, string> {
  if (!params || typeof params !== "object") return {};
  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
