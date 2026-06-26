---
name: Auth architecture
description: JWT auth pattern used in this project
---

- Access token: HS256 JWT, 15min expiry, signed with `JWT_SECRET` env var (fallback: hardcoded dev value)
- Refresh token: HS256 JWT, 7d expiry, stored in `refresh_tokens` DB table AND as httpOnly cookie
- Frontend: access token stored in Zustand (`src/store/auth.ts`) persisted to sessionStorage
- `setAuthTokenGetter` from `@workspace/api-client-react` is called in App.tsx `useEffect` to wire Zustand token into all API requests

**Why:** httpOnly cookie for refresh token prevents XSS theft; short-lived access token minimizes exposure. sessionStorage (not localStorage) for access token so it clears on browser close.

**How to apply:** Express app.ts must include `cookieParser()` middleware for refresh endpoint to read `req.cookies.refreshToken`. The `cors()` config must have `credentials: true` and `origin: true`.
