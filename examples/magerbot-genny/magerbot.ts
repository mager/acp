import Anthropic from "@anthropic-ai/sdk";
import { ACPAgent, ACPMessage } from "../../src";
import { Genny } from "./genny";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Magerbot — code, ops, and systems agent.
 * Handles anything technical. Delegates life/health decisions to Genny.
 */
export class Magerbot extends ACPAgent {
  private genny: Genny;

  constructor(genny: Genny) {
    super({
      id: "magerbot",
      vendor: "mager",
      capabilities: ["code", "deploy", "ops", "research", "planning"],
      systemPrompt: `You are magerbot, an elite engineering AI agent. 
You handle technical work: code, infrastructure, systems, ops.
You are concise, opinionated, and ship things. 
When a request has health, fitness, or life-planning components, you identify them clearly 
and flag them for your partner agent Genny to handle.`,
    });
    this.genny = genny;
  }

  async handle(ctx: ACPMessage): Promise<string> {
    const { intent, identity } = ctx;
    console.log(`\n[magerbot] Received from ${identity.agent_id}: "${intent.action}"`);

    // Use Claude to process the request
    const response = await claude.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: this.systemPrompt,
      messages: [{
        role: "user",
        content: `Request: ${intent.action}
Target: ${intent.target ?? "N/A"}
Context: ${JSON.stringify(intent.payload ?? {}, null, 2)}

Handle the technical/ops side of this. 
Then output a JSON block at the end with what you need to hand off to Genny (life/health agent):
{"genny_handoff": {"action": "...", "context": {...}}}`,
      }]
    });

    const magebotOutput = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`\n[magerbot] Output:\n${magebotOutput}`);

    // Extract handoff if magerbot flagged something for genny
    const handoffMatch = magebotOutput.match(/\{"genny_handoff":\s*(.+)\}/s);
    if (handoffMatch) {
      try {
        const handoff = JSON.parse(`{"genny_handoff": ${handoffMatch[1].replace(/\}$/, "}")}`);
        const gennyData = handoff.genny_handoff;

        console.log(`\n[magerbot] Delegating to genny via ACP...`);

        // Delegate to Genny — she gets full context including what magerbot already handled
        const gennyResponse = await this.delegate(
          this.genny,
          {
            action: gennyData.action,
            target: intent.target,
            payload: {
              ...gennyData.context,
              magerbot_handled: magebotOutput.split('{"genny_handoff"')[0].trim(),
            },
          },
          {
            current_task: intent.action,
            metadata: {
              delegated_by: "magerbot",
              original_request: intent.action,
            },
          }
        );

        return `${magebotOutput.split('{"genny_handoff"')[0].trim()}\n\n---\n\n${gennyResponse}`;
      } catch (e) {
        // No valid handoff, just return magerbot's output
      }
    }

    return magebotOutput;
  }
}
