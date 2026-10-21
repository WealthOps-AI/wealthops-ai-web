import { configuration } from "../config";
import type { Account, DashboardSummary, DevelopmentTokenResponse, PageResponse, UserRole } from "../types";
import { apiRequest } from "./client";

export async function getDevelopmentToken(role: UserRole): Promise<DevelopmentTokenResponse> {
  const response = await fetch(`${configuration.apiBaseUrl}/v1/auth/dev-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(`Local sign-in unavailable (${response.status}). Is the API running in Development?`);
  return (await response.json()) as DevelopmentTokenResponse;
}

export function getDashboard(token: string): Promise<DashboardSummary> {
  return apiRequest("/v1/dashboard/summary", token);
}

export function getAccounts(token: string, search = ""): Promise<PageResponse<Account>> {
  const query = new URLSearchParams({ page: "1", pageSize: "50" });
  if (search.trim()) query.set("search", search.trim());
  return apiRequest(`/v1/accounts?${query.toString()}`, token);
}
