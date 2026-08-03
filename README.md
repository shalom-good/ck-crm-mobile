# CK CRM Mobile

A role-aware field companion for the Collective Kindness team. It is the daily driver in the field, not the desktop CRM on a phone.

Built with Ionic + Capacitor + React + TypeScript. One codebase, two stores.

---

## Design intent

The app opens to one question. What needs me.

Your role is the lens. A case manager, a debt expert, a budgeter, a JPA, a coordinator, a director. Each one opens the same app and sees their own families, their own notifications, their own billing. Switch the role and the whole app re-lenses.

It does a few things and does them fast. See what needs you. Open a family. Add anything by talking. Ask CK AI a real question. Check your billing.

Adding information should never feel like data entry. Tap the plus, talk, and CK AI files it. A note, a task, a payment, a flag. It lands on the right family and tells whoever needs to know.

Calm is the surface. Off-white canvas. White cards. One hairline. A shadow you can barely see. Warm avatars for people without photos, never gray. Color shows up only where it carries meaning.

When in doubt, we cut.

---

## The app

Five tabs, thumb-zone law, raised capture button in the middle.

| Tab | What it is |
| --- | --- |
| **Home** | Role greeting, the "Ask CK AI" bar, and "What needs me" — flags, overdue payments, untouched families, mentions. Filtered to your role. |
| **Families** | Your caseload. Only families where your role is assigned. Filter by Needs attention or Behind. Tap into a family. |
| **＋ Capture** | The raised button. Add anything by typing or talking. CK AI proposes how to file it. |
| **Payments** | Your recent billing with a month summary, status tabs, and Add billing. |
| **Resources** | The directory, searchable, grouped by category. |

Two pushed screens sit outside the tabs so they get the full canvas:

- **Family detail** — hero, Call / Text / Email, financial snapshot, care team by role, one merged activity-and-payments timeline, sticky Add billing / Add note.
- **Ask CK AI** — a chat that answers from your families, payments, notes, and resources.

Settings holds the role switcher (the main control until auth is wired), appearance, and sign out.

---

## Run it

```bash
npm install
npm run dev          # vite dev server at http://localhost:5173
# or, with the Ionic CLI installed globally:
ionic serve
```

Open `http://localhost:5173/design` for every component in isolation.

Helpers for review and screenshots:
- `?theme=light`, `?theme=dark`, `?theme=system` forces the color scheme on any URL.
- `#add` opens the Capture sheet (also the real `ckcrm://add` deep link).

### Build for iOS / Android

```bash
npm run build
npx cap add ios            # first time only
npm run cap:ios            # builds, syncs, opens Xcode

npx cap add android        # first time only
npm run cap:android        # builds, syncs, opens Android Studio
```

Capacitor wraps the same `dist/` for both platforms. Use Capacitor Live Updates for over-the-air fixes without a store review.

---

## Architecture

```
src/
  theme/
    tokens.ts          design tokens in TypeScript
    variables.css      Ionic CSS variable overrides + dark mode
    index.css          Tailwind layer + base styles
  lib/
    roles.tsx          the role lens (RoleProvider, ROLES) — from `team` after auth
    appData.tsx        families / notices / payments / resources store
    ui.tsx             global Capture sheet + toast
    types.ts           Family, Notice, Payment, Resource, Activity
    mockData.ts        v1 fixtures
    format.ts          money + label-tone pills
    haptics.ts  time.ts  colorHash.ts  theme.ts
  components/
    FamilyCard, NoticeCard, PaymentRow, ResourceRow,
    AskBar, RoleChip, CaptureSheet, SegTabs, Pill,
    Avatar, StatusPill, StageDot, Header, SwipeRow, EmptyState, Skeleton, Toast
  pages/
    HomePage, FamiliesPage, FamilyDetailPage,
    PaymentsPage, ResourcesPage, AskPage, SettingsPage, DesignPage
  App.tsx              routes + tab bar + overlays
  main.tsx             providers + Ionic CSS
```

### Where Supabase plugs in

The project lrrovaqiudcbacxrdzkp is already the backend. Every read/write in `lib/appData.tsx` and `lib/roles.tsx` is the exact seam a query/mutation replaces:

| Scaffold call | Supabase |
| --- | --- |
| `roles` current role | `team.role` for the signed-in email |
| `familiesForRole` | `kdh_clients` (+ `new_clients`) where the role's email matches |
| `noticesForRole` | `flags` / `cm_alerts` / `email_nudges` |
| `payments` | `client_payments` (joined to the family) |
| `resources` | `resources` |
| `addPayment` | insert `client_payments` |
| Capture submit | classify, then insert `notes` / task / `client_payments` / `flags` |
| Ask CK AI | edge function with read scope to the caller's families |

Auth is Supabase magic link plus biometric unlock on later opens. Capacitor plugins are already declared in `package.json`.

No Airtable. This app is Supabase-native from day one.

---

## Token reference

One token layer in three files kept in lockstep: `tailwind.config.js` (utility classes), `theme/variables.css` (Ionic components), `theme/tokens.ts` (inline + computed). No component hardcodes a hex.

**Surfaces** — bg `#F7F8FA` / `#0B0D11`, card `#FFFFFF` / `#15181F`, hairline `#EEF0F3` / `#222730`.
**Text** — title `#0F172A`, body `#475569`, muted `#94A3B8`.
**Roles** — Case Manager `#3B82F6`, Debt Expert `#06B6D4`, Budgeter `#10B981`, JPA `#F59E0B`, Coordinator `#8B5CF6`, Director `#F97316`.
**Pills** — pastel fill at ~12% of a hue, full-saturation text, 6×10 padding, 12/600.
**Radii** — cards 16, inputs 12, pills/avatars 999, sheets 28.
**Type** — Inter. Card name 16/600, timestamp 12/500 muted, body 14/450. Money and counts tabular.
**Motion** — spring only, damping 22 / stiffness 220, as a matching cubic-bezier. Haptics 60–80ms on state changes, silent on navigation.

---

## Mockups

3x review renders in `mockups/`: `home`, `families`, `family-detail`, `capture`, `payments`, `ask`. Captured from the running app at 390 by 844, device scale 3.

---

## Status

Scaffold complete and building. All screens, the role lens, and the Capture + Ask flows run against mocked data. Dark mode ships from day one. Not yet wired: Supabase auth, the live queries above, push, and the offline queue. That is the next commit.
