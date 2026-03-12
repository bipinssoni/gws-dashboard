/**
 * useGws — React hook for calling gws MCP tools through the bridge.
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useGws('drive.files.list', {
 *     params: { pageSize: 10 },
 *     refreshInterval: 60_000,
 *   });
 *
 *   const { execute } = useGwsMutation('gmail.users.messages.modify');
 *   await execute({ id: 'msg_123', addLabelIds: ['IMPORTANT'] });
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BRIDGE_URL = typeof window !== 'undefined'
  ? (window as any).__WORKSPACE_OS_BRIDGE_URL || 'http://localhost:3100'
  : 'http://localhost:3100';

// ---------------------------------------------------------------------------
// Bridge Client
// ---------------------------------------------------------------------------

interface BridgeCallOptions {
  timeout?: number;
  signal?: AbortSignal;
}

async function bridgeCall(
  toolName: string,
  args: Record<string, unknown> = {},
  options: BridgeCallOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30_000);

  try {
    const res = await fetch(`${BRIDGE_URL}/api/tools/${toolName}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arguments: args }),
      signal: options.signal || controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Bridge error: ${res.status}`);
    }

    const data = await res.json();
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function bridgeHealth() {
  const res = await fetch(`${BRIDGE_URL}/api/health`);
  return res.json();
}

async function bridgeTools() {
  const res = await fetch(`${BRIDGE_URL}/api/tools`);
  return res.json();
}

// ---------------------------------------------------------------------------
// useGws — query hook (auto-fetching, caching, refetching)
// ---------------------------------------------------------------------------

interface UseGwsOptions {
  params?: Record<string, unknown>;
  refreshInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseGwsResult<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useGws<T = unknown>(
  toolName: string,
  options: UseGwsOptions = {},
): UseGwsResult<T> {
  const { params = {}, refreshInterval, enabled = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await bridgeCall(toolName, params) as T;
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [toolName, JSON.stringify(params), enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    const interval = setInterval(fetch, refreshInterval);
    return () => clearInterval(interval);
  }, [fetch, refreshInterval, enabled]);

  return { data, isLoading, error, refetch: fetch, lastUpdated };
}

// ---------------------------------------------------------------------------
// useGwsMutation — mutation hook (manual execution, no auto-fetch)
// ---------------------------------------------------------------------------

interface UseGwsMutationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  dryRun?: boolean;
}

interface UseGwsMutationResult {
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  isLoading: boolean;
  error: Error | null;
  data: unknown | null;
}

export function useGwsMutation(
  toolName: string,
  options: UseGwsMutationOptions = {},
): UseGwsMutationResult {
  const { onSuccess, onError, dryRun = false } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const execute = useCallback(async (args: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      // If dry-run, add the flag
      const finalArgs = dryRun ? { ...args, '--dry-run': true } : args;
      const result = await bridgeCall(toolName, finalArgs);
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toolName, dryRun]);

  return { execute, isLoading, error, data };
}

// ---------------------------------------------------------------------------
// useBridgeHealth — connection status hook
// ---------------------------------------------------------------------------

interface BridgeHealthResult {
  connected: boolean;
  status: string;
  toolCount: number;
  services: string[];
  checkNow: () => Promise<void>;
}

export function useBridgeHealth(pollInterval = 10_000): BridgeHealthResult {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('checking');
  const [toolCount, setToolCount] = useState(0);
  const [services, setServices] = useState<string[]>([]);

  const check = useCallback(async () => {
    try {
      const health = await bridgeHealth();
      setConnected(health.status === 'ok');
      setStatus(health.status);
      setToolCount(health.tools);
      setServices(health.services || []);
    } catch {
      setConnected(false);
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, pollInterval);
    return () => clearInterval(interval);
  }, [check, pollInterval]);

  return { connected, status, toolCount, services, checkNow: check };
}

// ---------------------------------------------------------------------------
// useAgentActivity — real-time agent activity via WebSocket
// ---------------------------------------------------------------------------

interface AgentActivity {
  id: string;
  timestamp: string;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  source: 'dashboard' | 'agent' | 'cli';
}

export function useAgentActivity(maxEntries = 100): {
  entries: AgentActivity[];
  connected: boolean;
} {
  const [entries, setEntries] = useState<AgentActivity[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = BRIDGE_URL.replace('http', 'ws') + '/api/stream';

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'activity') {
            setEntries(prev => {
              const next = [...prev, msg.data];
              return next.slice(-maxEntries);
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, [maxEntries]);

  return { entries, connected };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { bridgeCall, bridgeHealth, bridgeTools, BRIDGE_URL };
