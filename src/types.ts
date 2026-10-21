export type UserRole =
  | "Advisor"
  | "ClientService"
  | "OperationsAnalyst"
  | "ComplianceReviewer"
  | "BackOffice"
  | "Admin"
  | "Reader";

export type AccountStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Active"
  | "Suspended"
  | "Closed"
  | "Archived";

export interface PageResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface Account {
  id: string;
  householdId: string;
  primaryClientId: string;
  accountNumber: string;
  custodianReference: string;
  accountType: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  advisorCount: number;
  householdCount: number;
  clientCount: number;
  accountCount: number;
  accountsByStatus: Record<string, number>;
}

export interface DevelopmentTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: UserRole;
}
