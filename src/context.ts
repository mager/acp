import { ACPMessage, ACPIntent, ACPState, ACPMemory, ACPIdentity, ACP_VERSION } from "./types";

export function buildContext(
  identity: ACPIdentity,
  intent: ACPIntent,
  state: Partial<ACPState> & { session_id: string; turn_count: number },
  memory: ACPMemory = { retrieved: [] }
): ACPMessage {
  return {
    acp_version: ACP_VERSION,
    identity,
    state: {
      current_task: undefined,
      metadata: {},
      ...state,
    },
    memory,
    intent,
  };
}

export function validateContext(raw: unknown): ACPMessage {
  if (!raw || typeof raw !== "object") {
    throw new Error("ACP: context must be an object");
  }
  const msg = raw as Record<string, unknown>;

  if (!msg.acp_version) throw new Error("ACP: missing acp_version");
  if (!msg.identity) throw new Error("ACP: missing identity");
  if (!msg.state) throw new Error("ACP: missing state");
  if (!msg.intent) throw new Error("ACP: missing intent");

  const identity = msg.identity as Record<string, unknown>;
  if (!identity.agent_id) throw new Error("ACP: identity.agent_id required");
  if (!Array.isArray(identity.capabilities)) throw new Error("ACP: identity.capabilities must be array");

  const state = msg.state as Record<string, unknown>;
  if (!state.session_id) throw new Error("ACP: state.session_id required");
  if (typeof state.turn_count !== "number") throw new Error("ACP: state.turn_count must be number");

  const intent = msg.intent as Record<string, unknown>;
  if (!intent.action) throw new Error("ACP: intent.action required");

  return raw as ACPMessage;
}
