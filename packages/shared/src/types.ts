// ============================================================================
// Google Workspace Types (mapped from gws JSON output)
// ============================================================================

export interface GwsFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  shared: boolean;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  parents?: string[];
}

export interface GwsEmail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
  };
  internalDate: string;
}

export interface GwsEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
  }>;
  htmlLink?: string;
  attachments?: Array<{ fileUrl: string; title: string }>;
}

export interface GwsTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  updated: string;
}

export interface GwsChatMessage {
  name: string;
  text: string;
  sender: { displayName: string; type: string };
  createTime: string;
  space: { name: string; displayName: string };
}

export interface GwsSheetValues {
  range: string;
  majorDimension: string;
  values: string[][];
}

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolCallResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// Bridge Types
// ============================================================================

export interface BridgeHealth {
  status: "ok" | "starting" | "error";
  tools: number;
  services: string[];
  uptime: number;
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  source: "dashboard" | "agent" | "cli";
  approved?: boolean;
  dryRun?: boolean;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface PanelConfig {
  id: string;
  title: string;
  icon: string;
  color: string;
  enabled: boolean;
  refreshInterval?: number;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardLayout {
  name: string;
  panels: LayoutItem[];
  createdAt: string;
}

export interface WorkspaceOSConfig {
  services: string[];
  bridge: {
    port: number;
    gwsPath: string;
  };
  panels: Record<string, { refreshInterval: number }>;
  ai?: {
    provider: "anthropic" | "openai" | "none";
    model: string;
    features: {
      emailTriage: boolean;
      threadSummary: boolean;
      meetingPrep: boolean;
    };
  };
  agent: {
    requireApproval: "all" | "writes" | "none";
    modelArmor: boolean;
    auditLog: boolean;
  };
}

// ============================================================================
// Parsed / Enriched Types (used by panels)
// ============================================================================

export interface EnrichedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  time: string;
  snippet: string;
  unread: boolean;
  priority: "critical" | "action" | "reply" | "fyi";
  labels: string[];
}

export interface EnrichedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: string;
  type: "standup" | "one-on-one" | "review" | "focus" | "meeting";
  attendeeCount: number;
  hasLinkedDocs: boolean;
  prepReady: boolean;
}

export interface EnrichedFile {
  id: string;
  name: string;
  type: "doc" | "sheet" | "slide" | "pdf" | "other";
  icon: string;
  modified: string;
  owner: string;
  sharedWith: number;
  link?: string;
}
