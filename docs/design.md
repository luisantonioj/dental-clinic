# Design system

The visual reference is the clickable mockup in [`mockup/index.html`](../mockup/index.html). Open it in a browser. The app should look like it.

## Feel

Professional and calm, like clinical software. Near-white background in light mode, Discord-style greys in dark mode (never pure black), lots of whitespace, one teal accent, soft 1px borders, subtle shadows, 8px radius (12px for cards and dialogs).

## Typography

- **Inter** (400/500/600/700) via `next/font/google`.
- Sizes: page title 24/600, section title 16/600, body 14/400, small/meta 12/500.
- `font-variant-numeric: tabular-nums` for money, dates, times and tooth numbers (`.tabular`).

## Colour tokens

Defined as CSS variables in `src/app/globals.css` and mapped to Tailwind colours (`bg-bg`, `bg-surface`, `text-muted`, `border-border`, `bg-accent`, …). Components only use tokens.

| Token | Light | Dark (Discord-like) | Use |
|---|---|---|---|
| `--bg` | `#F8FAFC` | `#313338` | Page background |
| `--surface` | `#FFFFFF` | `#2B2D31` | Cards, sidebar, dialogs |
| `--surface-2` | `#F1F5F9` | `#1E1F22` | Subtle panels, table headers, deepest panels |
| `--hover` | `#F1F5F9` | `#35373C` | Row/item hover |
| `--input` | `#FFFFFF` | `#1E1F22` | Inputs |
| `--border` | `#E2E8F0` | `#3F4147` | Borders, dividers |
| `--border-strong` | `#CBD5E1` | `#4E5058` | Input borders, emphasis |
| `--heading` | `#0F172A` | `#F2F3F5` | Headings |
| `--text` | `#0F172A` | `#DBDEE1` | Body text |
| `--text-2` | `#334155` | `#B5BAC1` | Secondary text |
| `--muted` | `#64748B` | `#949BA4` | Meta, placeholders |
| `--accent` | `#0D9488` | `#2DD4BF` | Primary buttons, links, focus ring |
| `--accent-hover` | `#0F766E` | `#5EEAD4` | Hover |
| `--accent-soft` | teal 10% | teal 14% | Selected nav, soft badges |
| `--on-accent` | `#FFFFFF` | `#042F2E` | Text on accent |
| `--success` | `#16A34A` | `#4ADE80` | Paid, completed |
| `--warning` | `#D97706` | `#FBBF24` | Low stock, pending |
| `--danger` | `#DC2626` | `#F87171` | Allergies/medical alerts, overdue, destructive |
| `--info` | `#2563EB` | `#60A5FA` | Info badges |

Each status colour also has a `-soft` variant (10–14% alpha) for badge backgrounds.

**Workplace colours.** Each workplace stores a colour key from a fixed palette (`indigo`, `sky`, `violet`, `amber`, `rose`, `emerald`). It is used for the calendar, tags and the switcher dot, and has its own light and dark values.

## Theme

- Light / dark / system toggle in the topbar, remembered per browser by `next-themes`. Its inline script sets `data-theme` before first paint, so there is no flash.
- Dark mode is applied with `data-theme="dark"` on `<html>`. `system` follows `prefers-color-scheme`.
- Dark mode drops most shadows and relies on the surface steps (`--bg` → `--surface` → `--surface-2`).

## Layout

- **Desktop (≥ 1024 px):** fixed 248 px sidebar (brand, workplace switcher, nav, user card) + topbar (search trigger with `Ctrl K`, theme toggle, avatar) + content max-width 1200 px.
- **Tablet (768–1023 px):** collapsed icon sidebar.
- **Phone (< 768 px):** sidebar becomes a drawer, with a bottom nav (Home, Patients, Calendar, Earnings, More). 16 px gutters, no horizontal page scroll.
- Content pages: title row (h1 + primary action), then cards.

## Components

- shadcn/ui primitives (Button, Input, Select, Dialog, Sheet, Tabs, Table, Badge, Command, Toast) themed with the tokens.
- **Buttons:** primary (accent), secondary (surface + border), ghost, destructive. 36 px high, 44 px on touch.
- **Patient header:** avatar initials (hue from the name), name, code, age/sex, phone, balance. Allergies and medical alerts always show as a red banner under it.
- **Tooth chart:** SVG, FDI layout (upper 18→11 | 21→28, lower 48→41 | 31→38, child 55–51 | 61–65 / 85–81 | 71–75). Five surfaces per tooth, coloured by condition: caries red, filling blue, crown violet, RCT amber, missing greyed out with an X, planned work dashed.
- **Workplace tag:** small pill with the workplace colour dot and short name.
- **Money:** `₱1,500.00`, right-aligned in tables, tabular numbers.
- **Empty states:** icon, one sentence and the primary action.

## Accessibility

- WCAG AA contrast in both themes (the token values above pass for text on `--bg` and `--surface`).
- Visible focus ring: 2px `--accent` with 2px offset.
- 44 px minimum touch targets on touch devices.
- All icons have labels or `aria-hidden`. Dialogs trap focus. The search palette is keyboard-driven (↑ ↓ Enter Esc).
- Respect `prefers-reduced-motion`.
