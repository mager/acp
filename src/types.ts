export const ACP_VERSION = "0.2.0";

export interface ACPIdentity {
  agent_id: string;
  vendor?: string;
  capabilities: string[];
}

export interface ACPState {
  session_id: string;
  turn_count: number;
  current_task?: string;
  metadata?: Record<string, unknown>;
}

export interface ACPMemoryEntry {
  key: string;
  value: unknown;
  ttl?: number;
}

export interface ACPMemory {
  retrieved: ACPMemoryEntry[];
}

export interface ACPIntent {
  action: string;
  target?: string;
  constraints?: Record<string, unknown>;
  payload?: unknown;
}

export interface ACPMessage {
  acp_version: string;
  identity: ACPIdentity;
  state: ACPState;
  memory: ACPMemory;
  intent: ACPIntent;
}
