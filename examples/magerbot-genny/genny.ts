import Anthropic from "@anthropic-ai/sdk";
import { ACPAgent, ACPMessage } from "../../src";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Genny — life architecture agent.
 * Health, fitness, travel, goals, and centenarian protocol.
 * Thinks in decades. One clear message, then trusts you to execute.
 */
export class Genny extends ACPAgent {
  constructor() {
    super({
      id: "genny",
      vendor: "mager",
      capabilities: ["health", "fitness", "travel", "nutrition", "goals", "planning"],
      systemPrompt: `You are Genny, a life architecture AI agent. 
You think in decades, not days. You apply a centenarian protocol lens to everything.
Your domains: exercise, nutrition, travel planning, long-term goals, sleep, recovery.
You are calm and authoritative. One clear recommendation, not a wall of options.
You receive context from magerbot (the technical agent) and handle the human/life side.
When magerbot has already done work, acknowledge it and build on top of it.`,
    });
  }

  async handle(ctx: ACPMessage): Promise<string> {
    const { intent, state, identity } = ctx;
    console.log(`\n[genny] Received from ${identity.agent_id}: "${intent.action}"`);
    console.log(`[genny] Session: ${state.session_id} | Turn: ${state.turn_count}`);

    const magebotWork = (intent.payload as any)?.magerbot_handled;

    const response = await claude.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: this.systemPrompt,
      messages: [{
        role: "user",
        content: `Task: ${intent.action}
Target: ${intent.target ?? "N/A"}
${magebotWork ? `\nMagerbot already handled:\n${magebotWork}\n` : ""}
Additional context: ${JSON.stringify(intent.payload ?? {}, null, 2)}

Delegated by: ${state.metadata?.delegated_by ?? "user"}
Original request: ${state.metadata?.original_request ?? intent.action}

Handle the health, fitness, and life-planning side of this.`,
      }]
    });

    const output = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`\n[genny] Output:\n${output}`);
    return output;
  }
}
