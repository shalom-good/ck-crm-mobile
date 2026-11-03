# CK Team app — the CK look (App Store set)

Since 2026-11-02 every screen except the client portal uses the CK look:
the App Store screens (Design canvas RjWi67joSYU1GdA7ELZWWy), the same
values as the staff CRM ("bright"), the donor portal and the Academy.
The spec is the shared CK-LOOK note; this file is how the app does it.

## Scope: everything but the client portal

`html[data-look="ck"]` switches the look on. `index.html` ships with it and
`App.tsx` removes it while a **family** is signed in, so `src/pages/family/**`,
`FamilyHomePage` and everything a family sees after sign-in keep the Grove
values (the `:root` block in `variables.css` and the rules in `index.css`,
both unchanged). Rules for the look:

- tokens: the `html[data-look="ck"]` block at the end of `src/theme/variables.css`
  (a dark block is there too; `lib/theme.ts` still keeps the app light)
- components: `src/theme/ck-look.css`, every rule on a `gv-*` class scoped
  under `html[data-look="ck"]`; new `ck-*` classes are only used by
  in-scope screens
- a shared component (gv.tsx, Toast) must not change its markup for the
  family pages: change it in CSS under the scope, or add an opt-in prop

## Tokens

| Role | Token | Value |
|---|---|---|
| page | `--gv-paper` | #F3F5F1 |
| card | `--gv-card` | #FFFFFF |
| inner tile, day chip | `--gv-inset` | #EDF1EB |
| divider (line) | `--gv-hair` | #E1E7DF |
| control edge (line2) | `--gv-line` | #D6DDD4 |
| bar / progress track | `--gv-bar` | #E4EAE3 |
| titles, numbers | `--gv-ink` | #17241F |
| body | `--gv-text` | #1F2E28 |
| secondary + small labels | `--gv-mid` (= `--gv-quiet`) | #52625B (AA on paper and white) |
| icons, 14px+ only | `--gv-faint` | #6B7A73 |
| primary action, selected chip | `--gv-go` | #2E5146 (hover `--gv-go-deep` #1F3A32) |
| the one highlight | `--gv-lime` | #D7F36E (soft #EAF7B8 / ink #3E5C1E) |
| giving band, one bar (fill only) | `--gv-coral` | #EE7A5B; text on white in the band `--gv-coral-ink` #9A3B22 |
| attention count | `--gv-warn` | #B8492C |

Pastels, one per space (fill / ink): plan + CK families mint #DCEBDF/#2E5146 ·
Academy sky #DCE3F3/#33415F · KDH / debt apricot #F8D9CC/#8A3A22 (the old
`lavender` name maps here) · budget / fundraising yellow #F5EDB4/#5E5418 ·
team plum #EADCF5/#5B2D7A · attention rose #FADDD3/#9A3B22.

Type: Plus Jakarta Sans only (self-hosted). Page title 26/800 −.02em
(`.gv-h1`); the line above it 14/500 mid (`.ck-kicker`: the date, "Good
morning,"); card title 15/700; list title 14.5/600; meta 12 mid; eyebrow
11.5/700/.08em caps mid; stat number 24/800. Floor 12px. Money tabular.

## Shape

Cards white, radius 22, padding 16, no border, no shadow. Inner tiles,
event rows and notes radius 16 on a pastel or inset. Floating things (tab
bar, toast, sheets) white, radius 22–26, shadow `--gv-shadow-pop`
(0 14px 30px -18px rgba(23,36,31,.35)). Buttons are pills 48 tall
(min 44): primary forest with lime text, secondary white with a 1px line2
edge. Chips pill 38 tall, selected forest + white. Status pills radius 999,
12/700. Inputs 48 tall, radius 14, 1px line2, lime focus ring. Day chips
radius 14. People avatars 44 circle, lime, ink initials (`.ck-me`, and any
`Av round`); families are a round avatar in their space's pastel (`Av round
tint className="keep"`). 20px side gutter. No left-border cards, no
gradient washes, no emoji, no red for a family's money.

## Pieces

- `TopBar` (src/components/TopBar.tsx): 30px lime tile with the forest CK
  mark (src/assets/ck-mark-forest.svg) + "Collective Kindness", the space
  label on the right ("TEAM", "GIVING", "ACADEMY"); with a back button in
  front the label is dropped. `CkTile` is the tile alone (Logo, lock
  screen). `Header` = TopBar + title + meta + icon buttons.
- Tab bar (App.tsx + ck-look.css): floating white bar 14px off the sides
  and bottom (+ safe area), radius 26. Each item a 52x30 pill behind a 20px
  2px-stroke icon (src/components/ckIcons.tsx), 11px label. Active = lime
  pill, ink 700; inactive mid 600. Home · Families · Ask · Chats · Resources:
  Ask looks like every other item (sparkle icon, lime pill while the AI
  sheet is open); it opens a sheet, not a tab, so it is a button portaled
  over the empty center slot. Pages keep ~120px of bottom padding so
  nothing hides under it.
- Stat strip (`Strip`): one white card, columns split by 1px lines, number
  over label, the attention count in `--gv-warn`.
- Tasks (`.ck-task`): 22px checkbox radius 7 with a 2px forest border.
- This week (`.ck-days` / `.ck-day`): five day chips, today lime, then the
  day's meetings as pastel `Evt` rows.
- Next-step card (`.ck-next`): lime, radius 22, eyebrow at 70% ink, 20/800
  title, a forest pill.
- Picture tile (`.ck-art mint|sky|apricot|plum|yellow`): the flat pastel
  behind a door's line drawing (replaces the old gradient panels).
- Net each month (family profile): rounded vertical bars, height follows
  each month's net (lowest shortest), the signed value above each bar,
  past months grey #E4EAE3, this month coral, a dashed average with an
  "Avg" tag, months under; a month with no budget is a short dashed stub
  labelled "no budget".
- Giving: coral band with ink text and a white "Donate" pill in coral ink.

## Motion

Cards rise 22px + fade, .7s cubic-bezier(.2,.8,.2,1), staggered 100ms by
`--i` (`.gv-rise`); the tab pill fades between items; numbers count up once
(`CountUp`). `prefers-reduced-motion` turns all of it off.

## Shell

Start screen (`/start`): top bar, "Welcome.", four doors as white cards with
a pastel tile each (family mint, donor apricot, Academy sky, monthly number
yellow), the coral giving band, a quiet "Team sign-in", the quote of the
day. Doors: family (`/start/family`, mint), team (`/start/team`, plum),
donor (`/start/donor`, apricot), Academy (`/start/academy`, sky), Adopt
(`/start/adopt`, the CRM page in an iframe). Team: the five-item floating
bar above; Payments and Job Funnel open from Home's two link cards. Family:
the portal (out of scope for this look).

## Icon + splash

`assets/icon-only.png` (+ dark) is the App Store icon (lime tile, forest
leaves, coral heart); `assets/splash*.png` is that tile on paper / dark
paper. Run `npx @capacitor/assets generate` and `npx cap sync` after a
change. The web build has `public/favicon.png`, `apple-touch-icon.png`,
`icon-192/512.png` and `manifest.webmanifest`.
