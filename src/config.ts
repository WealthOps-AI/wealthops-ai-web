export const configuration = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, ""),
  appName: "WealthOps",
};
