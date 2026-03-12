import { ACPMessage, ACPIntent, ACPState, ACPMemory, ACPIdentity } from "./types.js";
import { buildContext, validateContext } from "./context.js";

function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `sess_${ts}_${rand}`;
}

export interface ACPAgentOptions {
  id: string;
  vendor?: string;
  capabilities: string[];
  systemPrompt?: string;
}

export class ACPAgent {
  protected identity: ACPIdentity;
  protected sessionId: string;
  protected turnCount: number = 0;
  protected systemPrompt: string;

  constructor(options: ACPAgentOptions) {
    this.identity = {
      agent_id: options.id,
      vendor: options.vendor,
      capabilities: options.capabilities,
    };
    this.sessionId = generateSessionId();
    this.systemPrompt = options.systemPrompt ?? `You are ${options.id}, an AI agent.`;
  }

  /**
   * Override this in your subclass to define what your agent does.
   * Receives full ACP context — identity, state, memory, intent all intact.
   */
  async handle(ctx: ACPMessage): Promise<string> {
    throw new Error(
      `${this.identity.agent_id}.handle() not implemented. Subclass ACPAgent and override handle(ctx).`
    );
  }

  /** Build a valid ACP message to hand off to another agent */
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
   * Delegate to another ACPAgent or any handler function with full context.
   * Pass an ACPAgent instance and it calls .handle() automatically.
   * Zero context lost at the handoff.
   */
  async delegate(
    target: ACPAgent | ((ctx: ACPMessage) => Promise<string>),
    intent: ACPIntent,
    state?: Partial<Omit<ACPState, "session_id" | "turn_count">>,
    memory?: ACPMemory
  ): Promise<string> {
    const ctx = this.createContext(intent, state, memory);
    if (target instanceof ACPAgent) {
      return target.handle(ctx);
    }
    return target(ctx);
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
