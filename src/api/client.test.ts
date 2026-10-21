import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends bearer auth and a correlation identifier", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ready: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ ready: boolean }>("/v1/health", "demo-token")).resolves.toEqual({ ready: true });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer demo-token");
    expect(new Headers(options.headers).get("X-Correlation-ID")).toBeTruthy();
  });

  it("returns a typed API error with correlation metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ title: "Not authorized." }),
      { status: 401, headers: { "Content-Type": "application/problem+json", "X-Correlation-ID": "trace-123" } },
    )));

    await expect(apiRequest("/v1/accounts", "expired-token")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Not authorized.",
      correlationId: "trace-123",
    });
  });
});
