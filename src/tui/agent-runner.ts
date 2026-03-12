import Anthropic from "@anthropic-ai/sdk";
import { ACPAgent, ACPMessage } from "../index.js";
import { ACPIntent, ACPState } from "../types.js";

interface HandoffCallbacks {
  onAgentStart: (agentId: string) => void;
  onAgentHandoff: (from: string, to: string, context: ACPMessage) => void;
  onAgentComplete: (agentId: string, response: string, acpContext: ACPMessage) => void;
}

/**
 * ACPAgentRunner — orchestrates agent teams with real-time TUI updates
 * 
 * This is the Claude Agent SDK integration layer. It uses the Anthropic
 * streaming API to provide real-time responses while maintaining full
 * ACP context across handoffs.
 */
export class ACPAgentRunner {
  private agents: Map<string, ACPAgent>;
  private currentAgent: string;
  private claude: Anthropic;
  private sessionId: string;
  private turnCount: number = 0;

  constructor(agentIds: string[]) {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.agents = new Map();
    this.sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this.currentAgent = agentIds[0];

    // Initialize agents
    for (const id of agentIds) {
      this.agents.set(id, this.createAgent(id));
    }
  }

  private createAgent(id: string): ACPAgent {
    const configs: Record<string, any> = {
      magerbot: {
        capabilities: ["code", "ops", "systems", "architecture", "debugging"],
        systemPrompt: `You are magerbot ⚡ — an elite engineering AI agent.
You handle: code, infrastructure, systems, debugging, architecture decisions.
You are concise, opinionated, and ship things.
When a request involves health, fitness, travel, or life planning, delegate to genny.
Output format: Provide your response, then if delegation is needed, end with:
DELEGATE_TO: genny
REASON: [brief reason for handoff]`,
      },
      genny: {
        capabilities: ["health", "fitness", "nutrition", "travel", "goals", "life_planning"],
        systemPrompt: `You are Genny 🌿 — a life architecture AI agent.
You think in decades. You apply a centenarian protocol lens.
Your domains: exercise, nutrition, sleep, travel planning, long-term goals.
You are calm and authoritative. One clear recommendation, then trust the user to execute.
When you receive context from magerbot, acknowledge their work and build on it.`,
      },
      franklin: {
        capabilities: ["research", "learning", "synthesis", "teaching"],
        systemPrompt: `You are Franklin 📚 — a research and learning AI agent.
You excel at breaking down complex topics, finding resources, and creating learning paths.
You are thorough and patient. You ask clarifying questions when needed.`,
      },
    };

    const config = configs[id] || { capabilities: ["general"], systemPrompt: "You are a helpful AI agent." };

    return new ACPAgent({
      id,
      capabilities: config.capabilities,
      systemPrompt: config.systemPrompt,
    });
  }

  getCurrentAgent(): string {
    return this.currentAgent;
  }

  async process(userInput: string, callbacks: HandoffCallbacks): Promise<string> {
    this.turnCount++;
    const entryAgent = this.agents.get(this.currentAgent);
    if (!entryAgent) throw new Error(`Agent ${this.currentAgent} not found`);

    callbacks.onAgentStart(entryAgent.agentId);

    // Build initial context
    const intent: ACPIntent = {
      action: "process_request",
      target: userInput,
      payload: { user_input: userInput },
    };

    const state: Partial<ACPState> = {
      session_id: this.sessionId,
      turn_count: this.turnCount,
      current_task: "processing",
    };

    // Process with potential handoffs
    return this.processWithAgent(entryAgent, intent, state, callbacks);
  }

  private async processWithAgent(
    agent: ACPAgent,
    intent: ACPIntent,
    state: Partial<ACPState>,
    callbacks: HandoffCallbacks
  ): Promise<string> {
    // Create ACP context
    const acpContext = agent.createContext(intent, state);

    // Call Claude with streaming for real-time updates
    const stream = await this.claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: (agent as any).systemPrompt || "You are a helpful AI agent.",
      messages: [
        {
          role: "user",
          content: `Request: ${intent.target}

Context: ${JSON.stringify(intent.payload, null, 2)}`,
        },
      ],
      stream: true,
    });

    let fullResponse = "";
    let handoffTarget: string | null = null;

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullResponse += chunk.delta.text;
      }
    }

    // Check for delegation
    const delegateMatch = fullResponse.match(/DELEGATE_TO:\s*(\w+)/i);
    const reasonMatch = fullResponse.match(/REASON:\s*(.+?)(?:\n|$)/i);

    if (delegateMatch) {
      handoffTarget = delegateMatch[1].toLowerCase();
      const reason = reasonMatch ? reasonMatch[1] : "delegation triggered";

      // Strip delegation markers from response
      fullResponse = fullResponse
        .replace(/DELEGATE_TO:\s*\w+/i, "")
        .replace(/REASON:\s*.+?(?:\n|$)/i, "")
        .trim();

      callbacks.onAgentComplete(agent.agentId, fullResponse, acpContext);

      // Perform handoff
      const targetAgent = this.agents.get(handoffTarget);
      if (targetAgent) {
        callbacks.onAgentHandoff(agent.agentId, handoffTarget, acpContext);
        
        // Update intent for handoff
        const handoffIntent: ACPIntent = {
          action: "continue_from_handoff",
          target: intent.target,
          payload: Object.assign(
            {},
            intent.payload as Record<string, unknown> || {},
            { previous_agent_output: fullResponse, handoff_reason: reason }
          ),
        };

        const handoffState: Partial<ACPState> = {
          session_id: this.sessionId,
          turn_count: this.turnCount,
          current_task: "handoff_processing",
          metadata: Object.assign(
            {},
            state.metadata || {},
            { delegated_by: agent.agentId, handoff_reason: reason }
          ),
        };

        this.currentAgent = handoffTarget;
        return this.processWithAgent(targetAgent, handoffIntent, handoffState, callbacks);
      }
    }

    callbacks.onAgentComplete(agent.agentId, fullResponse, acpContext);
    return fullResponse;
  }
}