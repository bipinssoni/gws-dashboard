# Agent Instructions for WorkspaceOS

## Project Overview
WorkspaceOS is a 3-column cockpit dashboard built on `gws` CLI (Google Workspace CLI).
It uses an MCP Bridge (Node.js, ~550 LOC) to translate HTTP into gws MCP stdio calls.
There is NO custom backend — gws IS the backend.

## Layout: 3-Column Cockpit
```
┌──────┬────────────────────┬──────────┐
│ Icon │    Left Sidebar    │  Center  │  Right Sidebar
│ Bar  │ Metrics/Timeline/  │ AI Chat  │  Analytics/
│      │ Tasks/QuickActions │ + Input  │  Drive/Inbox
└──────┴────────────────────┴──────────┘
```

## Architecture
```
Browser (React) → HTTP → MCP Bridge → stdio → gws mcp → Google Workspace APIs
```

## Key Files
- `packages/dashboard/src/App.jsx` — Complete cockpit UI (all 3 columns in one file)
- `packages/mcp-bridge/src/index.ts` — Auth-aware bridge with state machine
- `packages/dashboard/src/hooks/useGws.ts` — Hook for live gws tool calls
- `packages/shared/src/types.ts` — TypeScript types
- `docs/demo.html` — Standalone demo (no server needed)
- `workspace-os.config.ts` — User configuration

## App.jsx Structure
The entire UI lives in one file with these components:
- `IconBar` — Left icon navigation (5 icons)
- `LeftSide` — Metrics, calendar timeline, tasks, quick actions
- `Chat` — Center AI chat with prompt cards and message history
- `RightSide` — Analytics/Drive/Inbox tabs with sparkline charts
- `App` — Root component managing state (tasks, messages, typing)

## Styling
- Deep navy theme: `bg-[#0B1120]` base, `bg-[#0C1322]` sidebars, `bg-[#101B2D]` cards
- Borders: `border-[#162240]` or `border-[#18293F]`
- Text: `text-white/90` headings, `text-[#6B8AAE]` body, `text-[#3A5575]` muted
- Accent: `text-blue-400` for active states, `text-yellow-400` for unread count
- Tailwind utility classes + inline styles where needed

## Demo Data
All AI responses are keyword-matched from the `AI` object. Supports 6 response types:
briefing, meeting, emails, drive, tasks, reply (+ fallback).

## Development Commands
```bash
pnpm install          # Install all dependencies
pnpm dev              # Start bridge + dashboard
pnpm build            # Production build
```

## Commit Convention
Use conventional commits: `feat(chat): add email draft response`
