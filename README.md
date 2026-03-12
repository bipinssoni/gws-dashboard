<p align="center">
  <img src="docs/logo.svg" alt="WorkspaceOS" width="100" />
</p>

<h1 align="center">WorkspaceOS</h1>

<p align="center">
  <strong>Your AI-powered Google Workspace cockpit — built on <a href="https://github.com/googleworkspace/cli"><code>gws</code></a> CLI.</strong><br/>
  One dashboard. Every Workspace service. Conversational AI. Zero custom backend.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#live-demo">Live Demo</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/gws-%3E%3D0.7.0-green" alt="gws version" />
  <img src="https://img.shields.io/badge/react-18-61dafb" alt="React 18" />
  <img src="https://img.shields.io/badge/MCP-native-purple" alt="MCP" />
</p>

---

> **The first UI ever built for the Google Workspace CLI.** WorkspaceOS is a 3-column cockpit that puts your calendar, email triage, Drive files, tasks, and analytics in one screen — with a conversational AI center that can query all your Workspace data.

## Why?

Engineering teams live across 8–12 browser tabs. Gmail, Calendar, Drive, Sheets, Chat — all open, all demanding attention. There's no single view that answers: *"What needs my attention right now?"*

The [`gws` CLI](https://github.com/googleworkspace/cli) solved API fragmentation. WorkspaceOS solves the **UX problem**.

| Before | After |
|---|---|
| 8+ browser tabs | One cockpit |
| Manual email triage | AI-classified priority inbox |
| Open Calendar → find docs → prep | One-click meeting prep |
| No unified task view | Tasks, calendar, email in one sidebar |
| "What am I forgetting?" | AI morning briefing in 3 seconds |

## Live Demo

Open `docs/demo.html` in any browser — no install needed. Fully interactive with demo data:

```bash
# Just double-click the file, or:
open docs/demo.html
```

The demo includes working AI chat (6 prompt types), interactive task checkboxes, switchable analytics tabs, and the complete 3-column layout.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [gws CLI](https://github.com/googleworkspace/cli) installed and authenticated

```bash
# Install gws if you haven't
npm install -g @googleworkspace/cli

# Authenticate (one-time — opens browser for Google OAuth)
gws auth setup

# Clone WorkspaceOS
git clone https://github.com/user/workspace-os.git
cd workspace-os

# Install dependencies
pnpm install

# Start everything (bridge + dashboard)
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The dashboard auto-detects your auth state and guides you through setup if needed.

### Docker

```bash
docker compose up
```

## Features

### 🖥️ Three-Column Cockpit Layout

**Left Sidebar** — Your day at a glance:
- Live metrics: meetings, unread emails, pending tasks
- Today's calendar timeline with event details
- Interactive task list (click to complete — counters update everywhere)
- Quick actions for common workflows

**Center — AI Chat** — Conversational interface to your entire Workspace:
- 6 pre-built prompt cards for common queries
- Morning briefing: calendar + email + tasks in one response
- Meeting prep: linked docs, attendee info, previous notes, talking points
- Email summary: AI-triaged by priority with action recommendations
- Drive search: recent files, sharing info, storage usage
- Task management: view, complete, and organize tasks
- Email drafting: AI-composed replies with review before sending

**Right Sidebar** — Analytics & quick reference:
- Email volume chart (weekly sparkline)
- Meeting load trend (4-week sparkline)
- Live stats with real-time task counters
- Drive file browser tab
- Priority inbox tab with color-coded urgency

### 🔐 Built-in Auth Flow

WorkspaceOS handles the entire Google OAuth flow in the UI:

1. **gws not installed** → Shows install instructions with copy-paste commands
2. **Not authenticated** → "Sign in with Google" button triggers `gws auth login`
3. **Auth in progress** → Shows OAuth URL, handles "unverified app" warnings
4. **Ready** → Auto-transitions to dashboard

Credentials are AES-256-GCM encrypted in your OS keyring. WorkspaceOS never sees your Google password.

### 🤖 Agent-Ready

The MCP bridge exposes all `gws` tools over HTTP. Any MCP-compatible AI agent (Claude Code, Gemini CLI, VS Code) can connect:

```bash
# Bridge also serves as MCP endpoint
gws mcp -s drive,gmail,calendar,sheets
```

Agent actions appear in the audit log with full transparency.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  ┌───────┐  ┌───────────────┐  ┌────────────┐  │
│  │ Left  │  │    Center     │  │   Right    │  │
│  │Sidebar│  │   AI Chat     │  │  Sidebar   │  │
│  │       │  │               │  │            │  │
│  │Metrics│  │ Prompt Cards  │  │ Analytics  │  │
│  │Timeln │  │ Chat Messages │  │ Drive Tab  │  │
│  │Tasks  │  │ Chat Input    │  │ Inbox Tab  │  │
│  └───┬───┘  └───────┬───────┘  └─────┬──────┘  │
│      └──────────────┼────────────────┘          │
│                     │ HTTP                       │
└─────────────────────┼───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│           MCP Bridge (~550 LOC)                  │
│     Node.js: HTTP ↔ stdio + Auth Manager         │
│              ┌─────────┐                         │
│              │ gws mcp │ ← child process         │
│              └─────────┘                         │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│         Google Workspace APIs                    │
│  Drive │ Gmail │ Calendar │ Sheets │ Tasks │ ... │
└─────────────────────────────────────────────────┘
```

**No custom backend.** `gws` IS the backend. The bridge is a thin stdio↔HTTP translator with auth lifecycle management.

### Tech Stack

| Component | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Hooks-based, rich ecosystem |
| Styling | Tailwind CSS | Utility-first, dark theme |
| State | React hooks + props | Simple, no external state lib needed |
| Charts | Inline SVG sparklines | Zero dependencies, crisp rendering |
| Bridge | Node.js + Express | Thin proxy (~550 LOC) with auth management |
| CLI Backend | gws (Rust) | All Workspace API calls |
| AI | Claude API (optional) | Chat responses, email triage, meeting prep |
| Auth | gws OAuth + OS keyring | AES-256-GCM encrypted credentials |

## Project Structure

```
workspace-os/
├── packages/
│   ├── dashboard/                # React app (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── App.jsx           # Complete cockpit UI (3-column layout)
│   │   │   ├── hooks/useGws.ts   # Hook for calling gws MCP tools
│   │   │   └── main.tsx          # Entry point
│   │   └── index.html
│   ├── mcp-bridge/               # Auth-aware stdio↔HTTP bridge
│   │   └── src/index.ts          # Complete bridge with auth state machine
│   └── shared/                   # TypeScript types
│       └── src/types.ts
├── docs/
│   ├── demo.html                 # Standalone demo (open in browser)
│   └── logo.svg
├── .github/                      # CI + issue templates
├── docker-compose.yml            # One-command deploy
├── workspace-os.config.ts        # User configuration
├── CONTRIBUTING.md
├── AGENTS.md                     # Instructions for AI coding agents
└── LICENSE                       # Apache-2.0
```

## Configuration

```typescript
// workspace-os.config.ts
export default {
  services: ['drive', 'gmail', 'calendar', 'sheets', 'docs', 'chat'],
  bridge: { port: 3100, gwsPath: 'gws' },
  panels: {
    gmail: { refreshInterval: 30_000 },
    calendar: { refreshInterval: 60_000 },
  },
  ai: {
    provider: 'anthropic', // or 'none' — dashboard works without AI
    model: 'claude-sonnet-4-20250514',
  },
  agent: {
    requireApproval: 'writes',
    auditLog: true,
  },
};
```

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Start bridge + dashboard
pnpm build            # Production build
pnpm check            # Lint + type check
```

## Contributing

We'd love your help! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Best first contributions:
- **Add AI response types** — expand the chat's understanding
- **Build new right-sidebar tabs** — analytics, notifications, team view
- **Improve charts** — add more sparkline types, interactive tooltips
- **Mobile layout** — responsive 1-column cockpit for phones
- **Real gws integration** — replace demo data with live API calls via `useGws()` hook

## Security

- **Auth delegation**: WorkspaceOS never touches credentials. `gws` handles all OAuth.
- **OS keyring**: Credentials encrypted with AES-256-GCM, stored in macOS Keychain / Windows Credential Manager / Linux Secret Service.
- **No telemetry**: Zero data collection. Everything stays on your machine.
- **Scope control**: Enable only the Workspace services you need via config.

## Acknowledgments

- **[googleworkspace/cli](https://github.com/googleworkspace/cli)** — the CLI that makes this possible
- Built with React 18, Tailwind CSS, and inline SVG charts

## License

Apache-2.0 — same as `gws`.
