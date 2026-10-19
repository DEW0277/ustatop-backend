# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: a larger operator team** working the panel in shifts, every working day. They are UstaTop staff, not technical users, and they sign in with a login and password that an administrator issued.
- **Secondary: anyone reading the public pages** (`/privacy`, `/terms`): mobile-app users, and Google Play / App Store reviewers who check that these pages exist and are reachable without signing in.

## Product Purpose

UstaTop connects clients in Uzbekistan with craftsmen ("usta"): plumbers, electricians, repair specialists and similar. The client and craftsman experience is the mobile app (separate repository). This panel is where the platform is run. Operators carry three equally important jobs:

1. **Masters: onboarding and moderation.** A master profile is created only by an operator (`POST /admin/masters`), never self-registered. Operators review a profile's portfolio, services, prices and working hours before verifying it.
2. **Orders and reviews: oversight.** Follow orders by status, region and date, moderate or delete reviews, and block or unblock users.
3. **Statistics and overall control.** The dashboard shows platform totals and trends.

Reference data (regions, districts, service categories) is maintained here too, and feeds the mobile app's filters.

Success means operators can move through a day's queue of new masters, reported reviews and order issues quickly and without mistakes, and that every master a client sees in the app was checked by a person.

## Positioning

The trust mechanism belongs to UstaTop: no craftsman appears to clients until an operator has created and verified the profile. The panel is the instrument of that guarantee, and its moderation views exist to make that check thorough.

## Operating Context

- Used by several operators across shifts. Each works through queues (pending masters, reviews, orders), so the panel has to read as a work tool, not a showcase.
- Data is Uzbek: 14 regions, ~207 districts, phone numbers in `+998` format, prices in so'm.
- Account deletion in the app anonymizes the user (phone becomes `deleted:<id>`). The panel shows such users with an "O'chirilgan" badge, and they cannot be blocked or unblocked.
- Login is a login + password, with 5 failed attempts locking the login for 15 minutes. Operators change their own password on the Settings page.

## Capabilities and Constraints

- Stack (existing): Next.js 16 App Router, shadcn/ui (`base-nova` preset on Base UI), TanStack Query, react-hook-form + zod. The API is the NestJS backend in `apps/backend`, reached through the panel's `/api/backend/*` proxy.
- **Language:** Uzbek (Latin script) now. Russian is planned, so new UI text should be written so it can be extracted for translation later (no strings assembled from fragments, room for longer Russian labels). No i18n library is chosen yet.
- **Open decision: operator roles.** The backend has a single `ADMIN` role, so every operator can do everything, including deleting reviews and blocking users. It also keeps no audit log of who did what. A larger shift team makes per-role permissions and an action history likely needs, but neither is decided or built. Do not design UI that implies they exist.
- Public legal pages (`/privacy`, `/terms`) are draft texts with `[BRACKETED]` placeholders until the legal review is done (TASKS.md C-03). Do not present them as final.

## Brand Commitments

- Name: **UstaTop**.
- Voice: plain, direct Uzbek (Latin script, `o'` / `g'` with a plain apostrophe). Sentences are short and name the action ("Usta qo'shish", "Tasdiqlash", "Bloklash").
- No logo or brand assets exist in this repository yet (`apps/web/public` holds only the Next.js defaults).

## Evidence on Hand

- Real reference data: regions, districts and categories in `apps/backend/prisma/seed.ts`.
- No real user, master or order data. The dev database holds seed and test records only. Do not invent testimonials, usage numbers or customer names.
- Product and API spec: `docs/TZ.md`; open work: `TASKS.md`.

## Product Principles

1. **Moderation is the product's promise.** The verification views must show everything an operator needs to judge a master in one place.
2. **Built for queues and shifts.** Favor scanability, stable layouts and predictable controls over expression. An operator should be able to clear a queue without hunting.
3. **Destructive actions are deliberate.** Blocking, deleting reviews and revoking a master's verification always confirm, name what will happen, and never sit next to the routine action.
4. **Ready for a second language.** Every new screen should survive Russian text without redesign.
