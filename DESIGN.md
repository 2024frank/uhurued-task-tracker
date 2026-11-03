# Design System: Uhurued Task Tracker (Out There Workspace Language)

## Overview

`task.uhurued.com` inherits the established **Out There** administration and workspace design language (`/home/kusi/Desktop/Dev/out-there/admin`). It is an **Operate** surface built for software engineers and workspace leads: quiet warm paper surfaces in light mode, deep forest slate in dark mode, high-contrast tabular task queues, explicit section navigation, and a dedicated right-hand detail and action rail.

## Typography

- **Brand Mark:** `Bricolage Grotesque` (700, self-hosted `/fonts/bricolage-grotesque-700.ttf`), stacked brand lockup (`uhuru` in brand gold over `tasks.` in foreground ink).
- **Display & Section Headings:** `Barlow Condensed` (700 & 800, self-hosted `/fonts/barlow-condensed-700.ttf` and `/fonts/barlow-condensed-800.ttf`).
  - `h1`: `27px`, line-height `1.05`, weight `800`.
  - `h2`: `17px`–`22px`, line-height `1.15`, weight `800`.
  - `h3`: `15px`, line-height `1.3`, weight `800`.
- **Reading & Control Copy:** System UI sans (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif`), `14px` base with `1.55` line-height.
- **Code, Clone Commands, `.env` Keys & Fingerprints:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` with `font-variant-numeric: tabular-nums`.

## Color Tokens

### Light Theme (`:root`)
- `--bg`: `#F4F0E7` (Warm paper ground)
- `--surface`: `#FFFFFF` (Primary panel & table surface)
- `--soft`: `#EAE6DD` (Secondary / hover / table header surface)
- `--text`: `#142018` (Deep forest ink)
- `--muted`: `#5B6158` (Secondary metadata & labels)
- `--line`: `#D8D4CA` (Hairline borders & dividers)
- `--accent`: `#1F5133` (Forest green primary action & active indicator)
- `--accent-soft`: `#E2ECE0` (Soft green selection & active badge fill)
- `--brand-gold`: `#795715` (Brand mark accent)
- `--gold`: `#E8BD35` (Highlight rule)
- `--green`: `#207653` / `--green-bg`: `#E9F5EF` (Done / Resolved / Online status)
- `--amber`: `#915B0B` / `--amber-bg`: `#FFF3DC` (In Progress / Needs Review / Warning)
- `--danger`: `#A3262E` / `--danger-soft`: `#F8E7E6` (Bug / Blocked / Critical)

### Dark Theme (`:root[data-theme=dark]` & `prefers-color-scheme: dark`)
- `--bg`: `#0E1510` (Deep forest ground with subtle radial glow)
- `--surface`: `#18241C` (Elevated dark forest surface)
- `--soft`: `#1E2B22` (Secondary dark surface)
- `--text`: `#F4EEDC` (Warm cream ink)
- `--muted`: `#C9CDBE` (Muted sage text)
- `--line`: `#2C3A30` (Dark forest border)
- `--accent`: `#E4B73F` (Campus gold primary accent in dark mode)
- `--accent-soft`: `#2F2C17` (Muted gold selection ground)
- `--brand-gold`: `#E4B73F`
- `--green`: `#91D5B1` / `--green-bg`: `#21382C`
- `--amber`: `#EDCA80` / `--amber-bg`: `#3C3120`
- `--danger`: `#FF9B94` / `--danger-soft`: `#3A2323`

## Layout & Architecture

- **Topbar (`64px` sticky):** Stacked `uhuru tasks.` brand mark on the left; live local AI status pill (`Qwen3.6-Heretic 8083`), user badge (`Engineer` or `Admin`), theme toggle, and Sign Out button on the right.
- **Section Navigation (`sticky top: 64px`):** Horizontal bar with `aria-current="page"` underline tabs:
  1. **My Space** (Assigned tasks, personal progress writeups, quick repo & `.env` access)
  2. **All Tasks** (Full collaborative task queue, status tabs, search/filter, task detail + writeup/question/suggestion thread)
  3. **AI Transcript Studio** (Paste transcript or rough notes -> `qwen3.6-35b-a3b-heretic` drafts detailed tasks with title, markdown spec, acceptance criteria, repo link, and one-click assignment to any user)
  4. **Repos & `.env` Vault** (GitHub repositories, `git clone` commands, setup instructions, and encrypted/shared `.env` bundles with copy & download)
  5. **Bug Reports & Auto-Fix** (Bug queue wired to DeepSeek Harness `dsh` on port `3080` + `qwen3.6-35b-a3b-heretic` on port `8083`, showing live agent triage, test runs, and fix writeups)
  6. **Team** (Registered engineers, task load, direct task assignment, and email invite via `tracker@uhurued.com`)
- **Two-Column Review / Detail Split (`minmax(0, 1fr) 360px`):** Selecting any task or bug opens the full specification, repository instructions, and collaborative writeup/question/suggestion stream on the left, with a sticky assignment, status, and AI-assist panel on the right.

## Email Template (`tracker@uhurued.com`)

Preserves Out There's exact one-tone HTML table email layout (`520px` max width, `#122218` forest green background, `2px solid #FFD75B` header rule, `#FFD75B` campus gold headings/codes, `#EAE5D7` body copy, `#9BB0A2` footer) sent from `Uhurued Tracker <tracker@uhurued.com>` so sign-in codes, task assignments, and bug-fix alerts land in Gmail Primary.
