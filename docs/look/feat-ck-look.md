# feat/ck-look: the CK look in the team app

Branch `feat/ck-look` (off `feat/login`), 2026-11-02. Target: the App Store
set (Design canvas RjWi67joSYU1GdA7ELZWWy), team screens modelled on
`x-05-team-internal`. Spec: CK-LOOK note; how the app does it: DESIGN.md.

Shots are 390x844 @2x (and 320 where tight), captured with puppeteer
against vite on :3051 with a fake team / family session and every API call
answered from mock data (script: `/private/tmp/claude-501/-Users-shalomgoodman/b919b663-56de-40d9-92bb-ef4187d411c9/scratchpad/phase4/feat-ck-look/tools/cap.mjs`).
Before: `/private/tmp/claude-501/-Users-shalomgoodman/b919b663-56de-40d9-92bb-ef4187d411c9/scratchpad/phase4/feat-ck-look/before/` · After: `/private/tmp/claude-501/-Users-shalomgoodman/b919b663-56de-40d9-92bb-ef4187d411c9/scratchpad/phase4/feat-ck-look/after/` (`-320` suffix = 320 wide).

## How it is scoped

`html[data-look="ck"]` turns the look on; App.tsx removes it while a family
is signed in. The client portal (src/pages/family/**, FamilyHomePage) keeps
its Grove values. Verified: 90-family-home, 91-family-plan, 92-family-budget,
93-family-learn before vs after differ by 0 pixels above a 30/255 threshold.

## Screens changed

| # | Screen | Before | After |
|---|---|---|---|
| 01 | Start (four doors, giving band) | before/01-start.jpg | after/01-start.jpg, after/01-start-320.jpg |
| 02 | Team sign-in | before/02-team-login.jpg | after/02-team-login.jpg |
| 03 | Family sign-in door (look only) | before/03-family-door.jpg | after/03-family-door.jpg |
| 04 | Donor door | before/04-donor-start.jpg | after/04-donor-start.jpg |
| 05 | Academy door | before/05-academy-start.jpg | after/05-academy-start.jpg |
| 06 | Adopt (top bar only; body is the CRM iframe) | before/06-adopt.jpg | after/06-adopt.jpg |
| 10 | Team home | before/10-home.jpg | after/10-home.jpg, after/10-home-320.jpg |
| 11 | Families | before/11-families.jpg | after/11-families.jpg, -320 |
| 12 | Family profile | before/12-family-detail.jpg | after/12-family-detail.jpg, -320 |
| 13 | Chats | before/13-chats.jpg | after/13-chats.jpg |
| 14 | Chat thread | before/14-chat-thread.jpg | after/14-chat-thread.jpg, -320 |
| 15 | Payments | before/15-payments.jpg | after/15-payments.jpg, -320 |
| 16 | Job Funnel | before/16-job-funnel.jpg | after/16-job-funnel.jpg |
| 17 | Job Funnel detail | before/17-job-funnel-detail.jpg | after/17-job-funnel-detail.jpg |
| 18 | Ask CK AI | before/18-ask.jpg | after/18-ask.jpg |
| 19 | Settings | before/19-settings.jpg | after/19-settings.jpg, -320 |
| 20 | Resources | before/20-resources.jpg | after/20-resources.jpg |
| 21 | /design | before/21-design.jpg | after/21-design.jpg |
| — | Tab bar, Toast, lock screen, AI sheet, Logo | (in the shots above) | |
| — | App icon, splash, favicon, manifest | assets/, public/ | |

No horizontal scroll at 390 or 320 on any captured screen.

## Behaviour notes

- Tab bar keeps the same five destinations (Home, Families, Ask, Chats,
  Resources); Ask still opens the AI sheet, now as a forest pill in the bar.
- Home "Your tasks" = the attention engine's list written as tasks. The
  checkbox only sets a family aside for today on this device (localStorage
  `ck-home-set-aside`); nothing is written to the CRM.
- Home "This week" reads `meetings` from appData, which is empty today
  (no meetings feed yet), so it says "Nothing on the calendar today."
- Payments, Job Funnel and Settings got a back button in the top bar.
- A family's money (net a month, income gap) is no longer coloured coral.

## Left alone, and why

- Client portal: out of scope by rule, verified identical.
- Adopt: the body is the CRM's /adopt page in an iframe (did not load in the
  headless capture); only the app's top bar changed.
- Unused legacy components (Avatar, Chip, FilterPill, TabPills, SegTabs,
  StatusBadge, ProgressBar, HatchBarChart, HeroCard, ...): no screen renders
  them; they read the --ck-* tokens, which now follow the CK look.
- Line drawings in gv.tsx keep their ink strokes (shared with the portal).
- Dark tokens are defined but lib/theme.ts still forces light.
- Native icon/splash: sources replaced in assets/; run
  `npx @capacitor/assets generate` + `npx cap sync` (no ios/android dirs here).
- AI sheet open state was not captured; it reads the scoped tokens.
