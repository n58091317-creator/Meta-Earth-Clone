---
name: Firebase to Replit Auth migration
description: How Firebase Auth was replaced with Replit OIDC in the dashboard — wiring points, file locations, session storage.
---

# Firebase → Replit Auth Migration

## What changed
- `artifacts/dashboard/server/auth.ts` — now re-exports from `./replit_integrations/auth/`; no firebase-admin
- `artifacts/dashboard/server/replit_integrations/auth/` — OIDC strategy (replitAuth.ts), user storage (storage.ts), auth routes (routes.ts), index.ts
- `artifacts/dashboard/server/index.ts` — calls `setupAuth(app)` and `registerAuthRoutes(app)` before any other routes
- `artifacts/dashboard/src/App.tsx` — fetches `/api/auth/user` to check auth; redirects to `/api/login`; no Firebase SDK
- `artifacts/dashboard/src/api.ts` — uses `credentials: 'include'` (cookie session) instead of Bearer tokens
- `artifacts/dashboard/src/firebase.ts` — gutted to just a User type (kept to avoid import errors in components)

## DB tables added (in initDb)
- `sessions` — connect-pg-simple session store (sid, sess, expire)
- `auth_users` — Replit user profiles (id, email, first_name, last_name, profile_image_url)

## Auth routes (provided by Replit OIDC)
- `/api/login` — start login
- `/api/callback` — OIDC callback
- `/api/logout` — end session
- `/api/auth/user` — get current user (protected)

**Why:** Firebase auth requires external Firebase config (VITE_FIREBASE_* env vars), service account secrets, and client-side SDK — all incompatible with Replit's security model. Replit Auth uses OIDC session cookies, keeps credentials server-side, and is provisioned automatically.

**How to apply:** When adding new protected routes, use `isAuthenticated` middleware from `./auth`. Access user ID via `(req.user as any).claims.sub`.
