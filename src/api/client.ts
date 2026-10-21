import { configuration } from "../config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${configuration.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      "X-Correlation-ID": crypto.randomUUID(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const correlationId = response.headers.get("X-Correlation-ID") ?? undefined;
    let message = `Request failed (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
        message = body.detail;
      } else if (body && typeof body === "object" && "title" in body && typeof body.title === "string") {
        message = body.title;
      } else if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // Use the HTTP status when the gateway or service does not return JSON.
    }
    throw new ApiError(message, response.status, correlationId);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
