# Web traversal: `wealthops-ai-web`

## Ownership and boundaries

Owns the React/TypeScript workstation, browser API client, authentication UI, and theme. Backend authorization and domain rules remain in `wealthops-ai-be`; local TLS/reverse proxy configuration is in `wealthops-ai-platform`.

## Likely traversal path

1. Start at `src/main.tsx` and `src/shell/App.tsx` for application composition and routes/views.
2. Follow `src/api/client.ts` and `src/api/wealthOps.ts` for requests and API response handling.
3. Check `src/auth/AuthProvider.tsx` for local development sign-in behavior.
4. Check `src/theme/ThemeProvider.tsx` and `src/config.ts` for shared UI configuration.
5. Inspect `src/api/client.test.ts` for API-client test patterns.

## Focused validation

Run `npm ci`, `npm test`, and `npm run build` from this repository. Use the platform local guide for the browser-facing HTTPS workflow.

## Avoid broad traversal when

The task concerns endpoint authorization, database behavior, Nginx routing, or API contract ownership. Follow the backend, platform, or contracts profile instead.
