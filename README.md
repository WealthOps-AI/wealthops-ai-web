# wealthops-ai-web

React, TypeScript, and Vite advisor/operations workstation foundation. It uses a configurable light/dark/system theme, a centralized API client, and local Development-only synthetic role login.

Production authentication must use the configured OIDC provider. Never deploy the local development token endpoint or put real credentials in frontend configuration.

```powershell
npm ci
npm run dev
```
