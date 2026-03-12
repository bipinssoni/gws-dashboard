import type { WorkspaceOSConfig } from '@workspace-os/shared';

const config: WorkspaceOSConfig = {
  // Which gws services to enable (maps to gws mcp -s flag)
  services: ['drive', 'gmail', 'calendar', 'sheets', 'docs', 'chat'],

  // MCP Bridge settings
  bridge: {
    port: 3100,
    gwsPath: 'gws', // or absolute path to gws binary
  },

  // Panel refresh intervals (ms)
  panels: {
    gmail: { refreshInterval: 30_000 },     // 30 seconds
    calendar: { refreshInterval: 60_000 },   // 1 minute
    drive: { refreshInterval: 120_000 },     // 2 minutes
    sheets: { refreshInterval: 60_000 },     // 1 minute
    chat: { refreshInterval: 15_000 },       // 15 seconds
  },

  // AI features (completely optional — dashboard works without this)
  ai: {
    provider: 'none', // 'anthropic' | 'openai' | 'none'
    model: 'claude-sonnet-4-20250514',
    features: {
      emailTriage: false,    // AI-powered email priority classification
      threadSummary: false,  // One-click email thread summarization
      meetingPrep: false,    // Auto-generate meeting prep from linked docs
    },
  },

  // Agent mode settings
  agent: {
    requireApproval: 'writes', // 'all' | 'writes' | 'none'
    modelArmor: false,         // Enable Google Cloud Model Armor sanitization
    auditLog: true,            // Log all actions (human + agent) to activity feed
  },
};

export default config;
