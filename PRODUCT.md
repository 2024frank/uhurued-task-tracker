# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite + TypeScript + Hono serverless API + Neon PostgreSQL + Resend (`tracker@uhurued.com`) deployed on Vercel (`task.uhurued.com`), connected to the local uncensored `qwen3.6-35b-a3b-heretic` model (`http://127.0.0.1:8083/v1`) via the always-accessible local gateway (`http://127.0.0.1:8099` -> Cloudflare tunnel -> `https://kusi-qwen-api.vercel.app`) and automated via DeepSeek Harness (`dsh` on `http://127.0.0.1:3080`).

## Users

Software engineers, collaborators, and project leads working across Uhurued, Out There, ReadDocs, and Sankofa Robotics repositories.
- **Collaborating Engineers:** Sign up and sign in with a 6-digit passwordless email code sent from `tracker@uhurued.com`, view tasks assigned to them (by Kusi or by the local AI), submit progress writeups, ask technical questions, propose suggestions, clone linked GitHub repositories with setup instructions, access shared `.env` configuration bundles, and file actionable bug reports.
- **Workspace Lead / Admin (`fkusiapp@oberlin.edu` and designated admins):** Paste raw meeting/voice transcripts or notes so the local uncensored AI (`qwen3.6-35b-a3b-heretic`) synthesizes structured engineering tasks (title, detailed technical specification, acceptance criteria, target repository, priority) and assigns them to team members; manage repositories, onboarding instructions, and shared `.env` vaults; dispatch and monitor automated bug fixes via DeepSeek Harness (`dsh`).

## Product Purpose

Uhurued Task Tracker (`task.uhurued.com`) is a collaborative software engineering task tracker, `.env` configuration vault, repository onboarding hub, and autonomous bug-fix dispatch center powered by Kusi's local uncensored `qwen3.6-35b-a3b-heretic` model and DeepSeek Harness (`dsh`). Success means any engineer can sign in via email code, immediately see their assigned work, clone the right repo with working `.env` variables, publish progress writeups/questions, and have bug reports triaged, fixed, and tested automatically by the local model agent.

## Positioning

Unlike generic SaaS issue trackers, `task.uhurued.com` is directly wired into the workspace owner's always-accessible local uncensored `qwen3.6-35b-a3b-heretic` model (`127.0.0.1:8083`) and local DeepSeek Harness (`127.0.0.1:3080`)—turning meeting transcripts into assigned engineering specs and turning bug reports into autonomously fixed and tested code changes without external cloud LLM dependencies.

## Operating Context

- **Authentication & Email Notifications:** Passwordless 6-digit email verification codes and task-assignment notifications delivered via Resend from `Uhurued Tracker <tracker@uhurued.com>`, using the exact Out There one-tone email template (`#122218` forest green ground, `#FFD75B` campus gold, `#EAE5D7` warm cream) so emails land in Primary.
- **Transcript-to-Task Synthesis:** Raw transcripts or engineering notes are sent to `qwen3.6-35b-a3b-heretic` (`127.0.0.1:8083` locally or via `https://kusi-qwen-api.vercel.app/v1/chat/completions` in production) to generate structured tasks with titles, markdown specs, subtasks/acceptance criteria, repo links, and assignee recommendations.
- **Collaborative Engineering Threads:** Every task supports status transitions (`todo`, `in_progress`, `in_review`, `blocked`, `done`) and typed updates (`progress` writeup, `question`, `suggestion`, `ai_note`).
- **Repository Onboarding & `.env` Sharing:** Projects store GitHub repository URLs, exact `git clone` and setup commands, branch conventions, and shared `.env` files that signed-in engineers can reveal, copy, or download.
- **Autonomous Bug Triage & Fixing (`dsh`):** Bug reports filed on `task.uhurued.com` are polled by a DeepSeek Harness (`dsh`) watcher plugin (`task-tracker-ops`), which wakes the local `qwen3.6-35b-a3b-heretic` coding agent to inspect the local repository, implement a fix, run tests, and post the verification log and resolution back to `task.uhurued.com`.

## Capabilities and Constraints

- Open-source public GitHub repository (`2024frank/uhurued-task-tracker`).
- Deployed to Vercel with custom domain `task.uhurued.com` (GoDaddy `CNAME` record).
- Must work both locally against `http://127.0.0.1:8083/v1` and from Vercel production via the always-accessible tunnel gateway (`https://kusi-qwen-api.vercel.app/v1`).
- Preserves Out There's established UX/UI language and email template.

## Brand Commitments

- **Visual Identity:** Out There admin/workspace aesthetic — Bricolage Grotesque stacked/bold brand mark, Barlow Condensed display headings, system sans reading text, warm paper ground (`#F4F0E7`) in light mode and deep forest (`#0E1510` / `#18241C`) in dark mode, forest green (`#1F5133`) and gold (`#E4B73F` / `#FFD75B`) accents.
- **Email Identity:** Sender `Uhurued Tracker <tracker@uhurued.com>`, using the Out There one-tone HTML table email template.

## Evidence on Hand

- Out There email service (`/home/kusi/Desktop/Dev/out-there/server/services/email.ts`) and admin UI (`/home/kusi/Desktop/Dev/out-there/admin/src/styles.css`, `/home/kusi/Desktop/Dev/out-there/admin/src/App.tsx`).
- Local uncensored model `qwen3.6-35b-a3b-heretic` on `http://127.0.0.1:8083/v1` (`llama-qwen3.6-heretic.service`).
- Public gateway & Cloudflare tunnel (`/home/kusi/qwen-api/gateway.py` on `127.0.0.1:8099`, proxied at `https://kusi-qwen-api.vercel.app`).
- DeepSeek Harness on `http://127.0.0.1:3080` (`deepseek-harness.service`) with plugin architecture in `/home/kusi/.dsh/plugins/`.

## Product Principles

1. **Zero-Friction Engineer Onboarding:** An engineer signing in with their email has immediate access to their assigned tasks, exact `git clone` commands, setup steps, and `.env` variables in one place.
2. **Transcript-to-Execution Velocity:** Raw spoken or written transcripts turn into structured, assignable engineering specifications in seconds using the local uncensored model.
3. **Transparent Progress & Collaboration:** Progress writeups, blockers, questions, and architectural suggestions live directly alongside each task.
4. **Closed-Loop Autonomous Bug Resolution:** Bug reports aren't passive tickets—they trigger the local DeepSeek Harness agent (powered by `qwen3.6-35b-a3b-heretic`) to reproduce, patch, test, and report back automatically.
