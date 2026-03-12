/**
 * MCP Bridge — translates HTTP requests from the React dashboard
 * into gws MCP stdio protocol calls.
 *
 * Architecture:
 *   Browser (React) → HTTP → Bridge → stdio → gws mcp → Google APIs
 *
 * The bridge handles:
 *   1. HTTP transport (so React can talk to gws)
 *   2. CORS headers (for localhost dev)
 *   3. WebSocket broadcast (for real-time agent activity feed)
 *   4. Auth lifecycle (check, setup, login, status)
 *   5. gws install detection
 */

import express from 'express';
import cors from 'cors';
import { spawn, ChildProcess, execSync } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.BRIDGE_PORT || '3100', 10);
const GWS_PATH = process.env.GWS_PATH || 'gws';
const GWS_SERVICES = process.env.GWS_SERVICES || 'drive,gmail,calendar,sheets,docs,chat';
const GWS_EXTRA_ARGS = process.env.GWS_EXTRA_ARGS?.split(' ').filter(Boolean) || [];

// ---------------------------------------------------------------------------
// Auth State Machine
// ---------------------------------------------------------------------------

type AuthPhase =
  | 'checking'           // Initial state
  | 'gws_not_installed'  // gws binary not found
  | 'not_authenticated'  // gws found but no credentials
  | 'auth_in_progress'   // gws auth login running, waiting for browser
  | 'authenticated'      // Credentials valid
  | 'mcp_starting'       // MCP server booting
  | 'ready'              // MCP running, tools loaded
  | 'error';

interface AuthState {
  phase: AuthPhase;
  gwsInstalled: boolean;
  gwsVersion: string | null;
  gwsPath: string;
  authenticated: boolean;
  authUrl: string | null;
  services: string[];
  toolCount: number;
  error: string | null;
  lastChecked: string;
}

let authState: AuthState = {
  phase: 'checking',
  gwsInstalled: false,
  gwsVersion: null,
  gwsPath: GWS_PATH,
  authenticated: false,
  authUrl: null,
  services: GWS_SERVICES.split(','),
  toolCount: 0,
  error: null,
  lastChecked: new Date().toISOString(),
};

function updateAuth(patch: Partial<AuthState>): void {
  authState = { ...authState, ...patch, lastChecked: new Date().toISOString() };
  broadcast('auth', authState);
}

// ---------------------------------------------------------------------------
// gws Detection & Auth Checks
// ---------------------------------------------------------------------------

function checkGwsInstalled(): { installed: boolean; version: string | null; path: string } {
  const candidates = [
    GWS_PATH,
    join(homedir(), '.npm-global', 'bin', 'gws'),
    '/usr/local/bin/gws',
    join(homedir(), '.cargo', 'bin', 'gws'),
  ];

  for (const candidate of candidates) {
    try {
      const version = execSync(`${candidate} --version 2>&1`, { timeout: 5000 }).toString().trim();
      return { installed: true, version, path: candidate };
    } catch { continue; }
  }

  return { installed: false, version: null, path: GWS_PATH };
}

function checkGwsAuth(gwsPath: string): { authenticated: boolean; error: string | null } {
  // Check env-based auth first (highest priority)
  if (process.env.GOOGLE_WORKSPACE_CLI_TOKEN ||
      process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { authenticated: true, error: null };
  }

  // Check for credentials on disk
  const configDir = join(homedir(), '.config', 'gws');
  if (existsSync(join(configDir, 'credentials.json')) ||
      existsSync(join(configDir, 'credentials.enc'))) {
    return { authenticated: true, error: null };
  }

  // Check ADC default location
  if (existsSync(join(homedir(), '.config', 'gcloud', 'application_default_credentials.json'))) {
    return { authenticated: true, error: null };
  }

  // Try gws auth export as a final check
  try {
    const result = execSync(`${gwsPath} auth export 2>&1`, { timeout: 10000 }).toString().trim();
    if (result.includes('access_token') || result.includes('client_id') || result.includes('refresh_token')) {
      return { authenticated: true, error: null };
    }
  } catch { /* expected to fail if not authed */ }

  return { authenticated: false, error: 'No credentials found. Please authenticate with Google.' };
}

// ---------------------------------------------------------------------------
// Auth Login Process
// ---------------------------------------------------------------------------

let authProcess: ChildProcess | null = null;

function startAuthLogin(gwsPath: string, services?: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (authProcess) { authProcess.kill(); authProcess = null; }

    updateAuth({ phase: 'auth_in_progress', error: null, authUrl: null });

    const args = ['auth', 'login'];
    if (services) args.push('-s', services);

    console.log(`[bridge] Starting: ${gwsPath} ${args.join(' ')}`);
    authProcess = spawn(gwsPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stderr = '';

    authProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      console.log(`[gws auth] ${text.trim()}`);

      // Capture the OAuth consent URL
      const urlMatch = text.match(/(https:\/\/accounts\.google\.com\/[^\s]+)/);
      if (urlMatch) {
        updateAuth({ authUrl: urlMatch[1] });
      }
    });

    authProcess.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      console.error(`[gws auth stderr] ${chunk.toString().trim()}`);
    });

    authProcess.on('close', (code) => {
      authProcess = null;
      if (code === 0) {
        updateAuth({ phase: 'authenticated', authenticated: true, authUrl: null, error: null });
        resolve({ success: true });
      } else {
        updateAuth({ phase: 'not_authenticated', authUrl: null, error: stderr || `Exit code ${code}` });
        resolve({ success: false, error: stderr });
      }
    });

    // 5 minute timeout
    setTimeout(() => {
      if (authProcess) {
        authProcess.kill(); authProcess = null;
        updateAuth({ phase: 'not_authenticated', authUrl: null, error: 'Auth timed out (5min)' });
        resolve({ success: false, error: 'Timeout' });
      }
    }, 300_000);
  });
}

function startAuthSetup(gwsPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    updateAuth({ phase: 'auth_in_progress', error: null, authUrl: null });

    const proc = spawn(gwsPath, ['auth', 'setup'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      console.log(`[gws setup] ${text.trim()}`);
      const urlMatch = text.match(/(https:\/\/accounts\.google\.com\/[^\s]+)/);
      if (urlMatch) updateAuth({ authUrl: urlMatch[1] });
    });

    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        updateAuth({ phase: 'authenticated', authenticated: true, authUrl: null, error: null });
        resolve({ success: true });
      } else {
        updateAuth({ phase: 'not_authenticated', authUrl: null, error: stderr || 'Setup failed' });
        resolve({ success: false, error: stderr });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// MCP Process Manager
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timestamp: number;
}

class MCPProcess {
  private proc: ChildProcess | null = null;
  private buffer = '';
  private pending = new Map<string, PendingRequest>();
  private tools: unknown[] = [];
  private ready = false;

  constructor(
    private gwsPath: string,
    private services: string,
    private extraArgs: string[],
    private onActivity: (entry: AgentActivity) => void,
  ) {}

  async start(): Promise<void> {
    const args = ['mcp', '-s', this.services, ...this.extraArgs];
    console.log(`[bridge] Starting MCP: ${this.gwsPath} ${args.join(' ')}`);
    updateAuth({ phase: 'mcp_starting' });

    this.proc = spawn(this.gwsPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.proc.stdout!.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });

    this.proc.stderr!.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) console.error(`[gws stderr] ${msg}`);
    });

    this.proc.on('close', (code) => {
      console.error(`[bridge] gws MCP exited (code ${code})`);
      this.ready = false;
      updateAuth({ phase: 'error', error: `MCP process exited (code ${code})` });
      for (const [id, req] of this.pending) {
        req.reject(new Error(`gws exited (code ${code})`));
        this.pending.delete(id);
      }
    });

    await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'workspace-os-bridge', version: '0.1.0' },
    });

    this.sendNotification('notifications/initialized', {});

    const toolsResult = await this.send('tools/list', {}) as { tools?: unknown[] };
    this.tools = toolsResult?.tools || [];
    this.ready = true;

    updateAuth({ phase: 'ready', toolCount: this.tools.length });
    console.log(`[bridge] MCP ready — ${this.tools.length} tools`);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.ready) throw new Error('MCP not ready');
    const start = Date.now();
    const result = await this.send('tools/call', { name, arguments: args });
    this.onActivity({
      id: randomUUID(), timestamp: new Date().toISOString(),
      tool: name, args, result, durationMs: Date.now() - start, source: 'dashboard',
    });
    return result;
  }

  getTools(): unknown[] { return this.tools; }
  isReady(): boolean { return this.ready; }

  private send(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      this.pending.set(id, { resolve, reject, timestamp: Date.now() });
      if (!this.proc?.stdin?.writable) {
        reject(new Error('stdin not writable'));
        this.pending.delete(id);
        return;
      }
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  private sendNotification(method: string, params: unknown): void {
    this.proc?.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && this.pending.has(msg.id)) {
          const req = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          msg.error ? req.reject(new Error(msg.error.message || 'MCP error')) : req.resolve(msg.result);
        }
      } catch { /* non-JSON */ }
    }
  }

  stop(): void { this.proc?.kill('SIGTERM'); this.proc = null; this.ready = false; }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentActivity {
  id: string; timestamp: string; tool: string;
  args: Record<string, unknown>; result: unknown;
  durationMs: number; source: 'dashboard' | 'agent' | 'cli';
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

const wsClients = new Set<WebSocket>();

function broadcast(event: string, data: unknown): void {
  const msg = JSON.stringify({ event, data });
  for (const ws of wsClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/api/stream' });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ event: 'auth', data: authState }));
  ws.on('close', () => wsClients.delete(ws));
});

const activityLog: AgentActivity[] = [];
const MAX_LOG_SIZE = 500;

function onActivity(entry: AgentActivity): void {
  activityLog.push(entry);
  if (activityLog.length > MAX_LOG_SIZE) activityLog.shift();
  broadcast('activity', entry);
}

let mcp: MCPProcess | null = null;

// ======= AUTH ROUTES =======

app.get('/api/auth/status', (_req, res) => res.json(authState));

app.post('/api/auth/check', async (_req, res) => {
  const gws = checkGwsInstalled();
  if (!gws.installed) {
    updateAuth({ phase: 'gws_not_installed', gwsInstalled: false, gwsVersion: null, error: 'gws not found' });
    return res.json(authState);
  }
  updateAuth({ gwsInstalled: true, gwsVersion: gws.version, gwsPath: gws.path });

  const auth = checkGwsAuth(gws.path);
  updateAuth(auth.authenticated
    ? { phase: 'authenticated', authenticated: true, error: null }
    : { phase: 'not_authenticated', authenticated: false, error: auth.error });
  res.json(authState);
});

app.post('/api/auth/login', async (req, res) => {
  const gws = checkGwsInstalled();
  if (!gws.installed) return res.status(400).json({ error: 'gws not installed' });
  res.json({ started: true });
  const result = await startAuthLogin(gws.path, req.body?.services || GWS_SERVICES);
  if (result.success) await tryStartMCP(gws.path);
});

app.post('/api/auth/setup', async (_req, res) => {
  const gws = checkGwsInstalled();
  if (!gws.installed) return res.status(400).json({ error: 'gws not installed' });
  res.json({ started: true });
  const result = await startAuthSetup(gws.path);
  if (result.success) await tryStartMCP(gws.path);
});

app.post('/api/auth/reconnect', async (_req, res) => {
  if (mcp) { mcp.stop(); mcp = null; }
  const gws = checkGwsInstalled();
  if (!gws.installed) return res.status(400).json({ error: 'gws not installed' });
  const started = await tryStartMCP(gws.path);
  res.json({ success: started, state: authState });
});

// ======= DATA ROUTES =======

app.get('/api/health', (_req, res) => {
  res.json({
    status: authState.phase, authenticated: authState.authenticated,
    tools: authState.toolCount, services: authState.services,
    uptime: process.uptime(), gwsInstalled: authState.gwsInstalled,
    gwsVersion: authState.gwsVersion,
  });
});

app.get('/api/tools', (_req, res) => res.json({ tools: mcp?.getTools() || [] }));

app.post('/api/tools/:toolName/call', async (req, res) => {
  if (!mcp?.isReady()) {
    return res.status(503).json({
      error: 'MCP not ready', authPhase: authState.phase,
      hint: authState.phase === 'not_authenticated' ? 'POST /api/auth/login'
        : authState.phase === 'gws_not_installed' ? 'npm install -g @googleworkspace/cli'
        : 'MCP starting',
    });
  }
  try {
    const result = await mcp.callTool(req.params.toolName, req.body.arguments || {});
    res.json({ result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.get('/api/activity', (_req, res) => {
  const limit = Math.min(parseInt(String(_req.query.limit) || '50', 10), MAX_LOG_SIZE);
  res.json({ entries: activityLog.slice(-limit) });
});

app.post('/api/activity/external', (req, res) => {
  const entry: AgentActivity = {
    id: randomUUID(), timestamp: new Date().toISOString(),
    tool: req.body.tool || 'unknown', args: req.body.args || {},
    result: req.body.result || null, durationMs: req.body.durationMs || 0,
    source: req.body.source || 'agent',
  };
  onActivity(entry);
  res.json({ id: entry.id });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function tryStartMCP(gwsPath: string): Promise<boolean> {
  try {
    mcp = new MCPProcess(gwsPath, GWS_SERVICES, GWS_EXTRA_ARGS, onActivity);
    await mcp.start();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[bridge] MCP start failed: ${msg}`);
    updateAuth({ phase: 'error', error: `MCP failed: ${msg}` });
    mcp = null;
    return false;
  }
}

async function main(): Promise<void> {
  console.log('[bridge] Checking gws...');
  const gws = checkGwsInstalled();

  if (!gws.installed) {
    console.warn('[bridge] gws not found — dashboard will show install instructions');
    updateAuth({ phase: 'gws_not_installed', gwsInstalled: false, error: 'gws not found on PATH' });
  } else {
    console.log(`[bridge] Found gws ${gws.version} at ${gws.path}`);
    updateAuth({ gwsInstalled: true, gwsVersion: gws.version, gwsPath: gws.path });

    console.log('[bridge] Checking auth...');
    const auth = checkGwsAuth(gws.path);

    if (!auth.authenticated) {
      console.warn('[bridge] Not authenticated — dashboard will show login flow');
      updateAuth({ phase: 'not_authenticated', authenticated: false, error: auth.error });
    } else {
      console.log('[bridge] Auth valid — starting MCP...');
      updateAuth({ phase: 'authenticated', authenticated: true });
      await tryStartMCP(gws.path);
    }
  }

  // Always start HTTP server regardless of auth state
  server.listen(PORT, () => {
    console.log(`
╔═════════════════════════════════════════════════════════╗
║              WorkspaceOS MCP Bridge                     ║
║─────────────────────────────────────────────────────────║
║  HTTP:      http://localhost:${String(PORT).padEnd(30)}║
║  WebSocket: ws://localhost:${String(PORT).padEnd(27)}/api/stream  ║
║  Phase:     ${authState.phase.padEnd(42)}║
║  gws:       ${(gws.installed ? gws.version + ' ✓' : 'not found ✗').padEnd(42)}║
║  Auth:      ${(authState.authenticated ? 'valid ✓' : 'required ✗').padEnd(42)}║
║  Services:  ${GWS_SERVICES.padEnd(42)}║
║  Tools:     ${String(authState.toolCount).padEnd(42)}║
╚═════════════════════════════════════════════════════════╝
    `);
  });

  const shutdown = () => {
    console.log('\n[bridge] Shutting down...');
    if (authProcess) authProcess.kill();
    mcp?.stop();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
