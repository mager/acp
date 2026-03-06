import { ACPMessage, ACPIntent, ACPState, ACPMemory, ACPIdentity } from "./types";
import { buildContext, validateContext } from "./context";

let sessionCounter = 0;

function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `sess_${ts}_${rand}`;
}

export interface ACPAgentOptions {
  id: string;
  vendor?: string;
  capabilities: string[];
}

export class ACPAgent {
  private identity: ACPIdentity;
  private sessionId: string;
  private turnCount: number = 0;

  constructor(options: ACPAgentOptions) {
    this.identity = {
      agent_id: options.id,
      vendor: options.vendor,
      capabilities: options.capabilities,
    };
    this.sessionId = generateSessionId();
  }

  /** Build a valid ACP message to send to another agent */
  createContext(
    intent: ACPIntent,
    state?: Partial<Omit<ACPState, "session_id" | "turn_count">>,
    memory: ACPMemory = { retrieved: [] }
  ): ACPMessage {
    this.turnCount++;
    return buildContext(
      this.identity,
      intent,
      {
        session_id: this.sessionId,
        turn_count: this.turnCount,
        ...state,
      },
      memory
    );
  }

  /** Validate and parse an incoming ACP message */
  parseContext(raw: unknown): ACPMessage {
    return validateContext(raw);
  }

  /**
   * Delegate to another agent function with full ACP context.
   * Passes the built context and returns whatever the target agent returns.
   */
  async delegate(
    targetAgent: (ctx: ACPMessage) => Promise<string>,
    intent: ACPIntent,
    state?: Partial<Omit<ACPState, "session_id" | "turn_count">>,
    memory?: ACPMemory
  ): Promise<string> {
    const ctx = this.createContext(intent, state, memory);
    return targetAgent(ctx);
  }

  get agentId(): string {
    return this.identity.agent_id;
  }

  get currentSessionId(): string {
    return this.sessionId;
  }

  /** Start a fresh session (new session_id, reset turns) */
  newSession(): void {
    this.sessionId = generateSessionId();
    this.turnCount = 0;
  }
}
