# Uhurued Task Tracker (`task.uhurued.com`)

Open-source collaborative software engineering task tracker, `.env` configuration vault, repository onboarding hub, and autonomous local **Qwen3.6-Heretic (`qwen3.6-35b-a3b-heretic`) + DeepSeek Harness (`dsh`)** bug-fix platform.

- **Production URL:** [https://task.uhurued.com](https://task.uhurued.com)
- **Outbound Email Identity:** `Uhurued Tracker <tracker@uhurued.com>` (using Out There's one-tone `#122218` / `#FFD75B` HTML email template)
- **Local Uncensored Model:** `qwen3.6-35b-a3b-heretic` (`http://127.0.0.1:8083/v1`, exposed globally via Cloudflare Tunnel & `https://kusi-qwen-api.vercel.app/v1`)
- **Autonomous Bug-Fix Harness:** DeepSeek Harness (`dsh` on `http://127.0.0.1:3080`) with `dsh-plugin/tools.mjs` & `dsh-plugin/watcher.mjs`

---

## Core Workflows

1. **Passwordless Email-Code Sign-Up & Sign-In (`tracker@uhurued.com`):**
   - Software engineers enter their email to receive a 6-digit login code sent from `Uhurued Tracker <tracker@uhurued.com>` using the Out There one-tone email template.
   - Upon signing in, engineers land in **My Space**, showing all tasks assigned to them by Kusi or by the local AI model.
2. **Transcript-to-Task AI Studio (`qwen3.6-35b-a3b-heretic`):**
   - Paste any raw meeting transcript, voice dump, or rough notes into **AI Transcript Studio**.
   - The local uncensored model (`qwen3.6-35b-a3b-heretic` on port `8083`) synthesizes structured engineering tasks with a clear title, multi-paragraph technical specification, acceptance criteria checklist, repo file pointers, and priority.
   - Assign tasks to any collaborator with one click—automatically delivering an assignment email from `tracker@uhurued.com`.
3. **Engineer Progress Writeups, Questions & Suggestions:**
   - Every task has a collaborative engineering thread where assignees and teammates post **Progress Writeups**, **Questions**, and **Architecture Suggestions**, or query **Qwen3.6-Heretic (8083)** for implementation code and debugging commands.
4. **GitHub Repository Onboarding & Shared `.env` Vault:**
   - Central hub for project repositories (`2024frank/uhurued-task-tracker`, `Sankofa-Robotics/out-there`, `AnanseNet-Inc/even-pdf-reader`), one-line `git clone` commands, setup steps, and shared `.env` files (with reveal/mask, clipboard copy, `.env` file download, and live updates).
5. **Bug Reporting & Autonomous DeepSeek Harness (`dsh`) Auto-Fix:**
   - Filing a bug report immediately runs root-cause triage on `qwen3.6-35b-a3b-heretic` (`127.0.0.1:8083`) and wakes the DeepSeek Harness (`dsh` on `127.0.0.1:3080`) `task-tracker-ops` watcher plugin (`dsh-plugin/`).
   - The agent inspects the local repository, patches the bug, runs `npm test`, and posts the verification output and resolution summary back to `task.uhurued.com`.

---

## Quick Start

```bash
git clone https://github.com/2024frank/uhurued-task-tracker.git
cd uhurued-task-tracker
cp .env.example .env.local
npm install
npm test
npm run dev
```

---

## GoDaddy DNS Setup for `task.uhurued.com`

Add the following DNS record in your GoDaddy DNS zone for **`uhurued.com`**:

| Type | Name / Host | Value / Points To | TTL |
| :--- | :--- | :--- | :--- |
| `CNAME` | `task` | `ecdd5a9c4317ff54.vercel-dns-016.com.` (or `cname.vercel-dns.com.`) | `600` (or Default) |

---

## License

MIT
