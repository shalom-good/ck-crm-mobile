# CK Team app — the Grove look (Emitly reference)

The app follows the same design system the CRM (crm.collectivekindness.net),
the client portal and both sign-in pages moved to on 2026-10-27..30. The
reference is the Dribbble shot "Emitly – Email Marketing CRM Platform"
(shot 25167023). Less is more: adopt its structure, spacing and restraint.

## Tokens (src/theme/variables.css)

| Role | Token | Value |
|---|---|---|
| page | `--gv-paper` | #F3F5F1 |
| card | `--gv-card` | #FFFFFF |
| inner tile / input | `--gv-inset` | #F4F6F2 |
| divider inside a card | `--gv-hair` | #EAEDE7 |
| control edge | `--gv-line` | #E2E6E0 |
| headings, numbers | `--gv-ink` | #1C2E29 |
| body | `--gv-text` | #223632 |
| meta | `--gv-mid` | #5F6D68 |
| labels | `--gv-quiet` | #86928C |
| THE action | `--gv-go` | #2E5146 |
| the one live thing | `--gv-lime` | #D7F36E |
| the one emphasised bar | `--gv-coral` | #E8714F |
| resting bar | `--gv-bar` | #E9ECE7 |
| up / down | `--gv-up` #3B7A2A on #E8F5D8 · `--gv-down` #B8463A on #FBE5E2 |
| pastels | mint #DDF3E6/#1F5E3A · sky #DCEBFA/#1F4E79 · apricot #FDE3C8/#8A4B10 · plum #E9D5F5/#5B2D7A · rose #FBE0E6/#9B2C4A · yellow #FFF0A3/#6B5A00 · lavender #F3D9F7/#6D3D7A |

Type: Plus Jakarta Sans only (self-hosted, `public/fonts`). Screen title
28/800 −.025em, card title 15.5–17/700, body 14.5, meta 12.5, eyebrow 11/700
caps .09em quiet. Numbers 800 tabular.

Shapes: cards radius 20, no border, soft shadow (`--gv-shadow`), never
nested. Buttons radius 14, 52 tall. Pills radius 8, 24 tall, tinted fill with
matching ink, never bordered. Icon buttons 36, radius 11. Avatars: initials
on a pastel, 12px corners for families, round for people.

## Rules

- One forest primary button per screen. Secondary actions are ghost (white,
  hairline) or text links in forest.
- Lime marks ONE thing per screen: the live journey step, the selected
  day, the active tab icon. Never a block of lime.
- Coral is for the one emphasised bar or a short / negative number.
- Red only for a loss or a blocker (rose pill).
- Pastels mean categories: mint = CK / budgeting, lavender = KDH / debt,
  yellow = to settle / next, sky = place / date, apricot = people / kids,
  plum = milestones.
- Stat rows are one white strip with vertical hairlines (`Strip`).
- Charts: rounded grey bars, one coral bar, dashed average line (`Bars`).
- Schedule / list rows are full-width pastel blocks with a white icon tile.
- Empty states are one quiet sentence with one text action, no drawing,
  except on a screen that is otherwise empty (then a line drawing).
- No uppercase tracked labels except the small eyebrows; no bordered
  chips; no dark cards (the focal card is forest with a lime pill).
- Motion: cards rise 12px / .6s staggered 60ms (`gv-rise` + `--i`), bars
  grow, numbers count up (`CountUp`), pills pop, drawings sketch in.
  `prefers-reduced-motion` turns all of it off.
- Everything must fit at 390 and 320 wide: no `nowrap` on copy, ellipsis on
  single-line names, `minWidth: 0` on flex children.

## Primitives (src/components/gv.tsx)

`Card`, `Eyebrow`, `CardTitle`, `Pill`, `Btn`, `Strip`, `CountUp`, `Bars`,
`Track`, `Av`, `Row`, `Evt`, `Chips`, `Empty`, and the drawings `HouseArt`,
`TeamArt`, `CalendarArt`, `PlantArt`. Older components still read the
`--ck-*` names, which are remapped onto the Grove tokens.

## Shell

Start screen (`/start`) → family code (`/start/family`) or team sign-in
(`/start/team`). Team: five tabs (Home, Families, Ask, Chats, Resources)
with a raised forest Ask button. Family: the portal home in the app.
