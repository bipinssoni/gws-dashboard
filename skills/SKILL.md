# WorkspaceOS Development Skill

## Context
WorkspaceOS is a 3-column cockpit dashboard built on the `gws` CLI.
MCP Bridge (~550 LOC Node.js) handles auth + stdio↔HTTP translation.
No custom backend — gws IS the backend.

## Layout
```
[IconBar 44px] [LeftSide 215px] [Center flex] [RightSide 215px]
```

## Key Patterns

### Adding an AI response
1. Add the response text to the `AI` object in `App.jsx`
2. Add keyword matching in the `send()` callback
3. Use `**bold**` for headers, `•` for bullet points, `\n` for line breaks

### Adding a right sidebar tab
1. Add tab config: `{id:"myTab", i:"🔧", l:"My Tab"}`
2. Add conditional render: `{tab==="myTab" && (<div>...</div>)}`

### Using live gws data
```typescript
const { data, isLoading } = useGws('drive.files.list', {
  params: { pageSize: 10 },
  refreshInterval: 60_000,
});
```

### Styling (deep navy theme)
- Base: `#0B1120`, Sidebars: `#0C1322`, Cards: `#101B2D`
- Borders: `#162240`, Text: `#6B8AAE`, Muted: `#3A5575`
- Active: `blue-400`, Warning: `yellow-400`, Success: `emerald-400`
