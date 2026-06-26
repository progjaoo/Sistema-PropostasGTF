---
name: Seed script pattern
description: How the database seed is structured and run
---

Seed lives at `scripts/src/seed.ts`. Run with `pnpm --filter @workspace/scripts run seed`.

**Pattern:**
- Uses `db.insert(...).onConflictDoNothing()` everywhere so it is safe to re-run
- Bcrypt salt rounds = 12
- Default admin: `admin@radio88fm.com.br` / `Admin@123`
- Default comercial: `carlos@radio88fm.com.br` / `Comercial@123`
- Creates: 1 station, 2 users, 1 advertiser, 4 product templates, 6 proposal categories, 2 proposal templates with products

**Why:** `onConflictDoNothing` avoids duplicate-key errors when re-seeding. Unique constraints on email (users) and cnpj (advertisers) and slug (categories) are the conflict targets.
