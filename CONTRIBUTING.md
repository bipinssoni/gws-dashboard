# Contributing to WorkspaceOS

Thanks for your interest! WorkspaceOS is designed to make contributions easy — the entire UI is in one file, and the architecture is intentionally simple.

## Quick Start

```bash
git clone https://github.com/<your-user>/workspace-os.git
cd workspace-os
pnpm install
pnpm dev
```

> **No `gws` setup needed to develop.** The dashboard runs with demo data by default. All AI responses are keyword-matched from local data — no API calls required.

## Ways to Contribute

### 🤖 Add AI Response Types (Easiest!)
The `AI` object in `App.jsx` maps keywords to responses. Add new ones:
```javascript
// In the AI object, add:
analytics: "📊 **Your Workspace Analytics:**\n\n...",

// In the send() function, add the keyword match:
else if (l.includes("analytics") || l.includes("stats")) r = AI.analytics;
```

### 📊 Add Right Sidebar Tabs
The `RightSide` component has a `tab` state. Add a new tab:
1. Add tab config to the tabs array
2. Add a `{tab === "yourTab" && (...)}` block with your content
3. Use the `Spark` component for any charts

### 📅 Enhance Left Sidebar
- Add smart grouping to the timeline (morning/afternoon blocks)
- Add task due dates and priority colors
- Build a "People" section showing frequent contacts

### 🎨 Improve the Chat
- Add streaming text animation (character by character reveal)
- Add code block rendering with syntax highlighting
- Add clickable action buttons inside AI responses
- Add conversation history persistence via localStorage

### 🔌 Wire Up Real Data
Replace demo data with live `gws` calls using the `useGws()` hook:
```typescript
const { data } = useGws('calendar.events.list', {
  params: { timeMin: new Date().toISOString(), maxResults: 10 },
  refreshInterval: 60_000,
});
```

### 📱 Mobile Layout
Build a responsive 1-column layout for phones — collapse sidebars into swipeable panels or a bottom sheet.

## Code Style

- **React hooks** — functional components only
- **Tailwind + inline styles** — no separate CSS files
- **One file per major section** — App.jsx is intentionally monolithic for simplicity
- **Demo data always works** — never break the offline/demo experience

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/):
```
feat(chat): add analytics response type
fix(sidebar): timeline scroll on Firefox
docs: update architecture diagram
```

## Pull Request Process

1. Fork and branch from `main`
2. Make your changes
3. Verify `docs/demo.html` still works (double-click to open)
4. Verify `pnpm dev` runs without errors
5. Submit PR with clear description

## Architecture Decisions

| Decision | Rationale |
|---|---|
| No custom backend | `gws` IS the backend. Less code = less bugs. |
| Demo data built-in | Contributors don't need Google API access. |
| Monolithic App.jsx | Easy to understand, grep, and modify. Split later when it hurts. |
| Inline SVG charts | Zero chart dependencies. Sparklines are ~20 lines each. |
| Keyword-matched AI | Simple, predictable, no API key needed for demos. |

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0.
