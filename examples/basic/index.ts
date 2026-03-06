/**
 * ACP Basic Example — Two Claude agents passing context via ACP
 *
 * Agent A (researcher) does research, builds state, then delegates
 * to Agent B (writer) with full ACP context — no context lost at handoff.
 *
 * Run: ANTHROPIC_API_KEY=your_key npx ts-node examples/basic/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { ACPAgent, ACPMessage } from "@mager/acp";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Agent A: Researcher ---
const researcher = new ACPAgent({
  id: "researcher",
  vendor: "myteam",
  capabilities: ["web_search", "analyze", "summarize"],
});

// --- Agent B: Writer ---
const writer = new ACPAgent({
  id: "writer",
  vendor: "myteam",
  capabilities: ["write", "edit", "format"],
});

/**
 * The writer agent receives a full ACP context and uses it to produce a summary.
 * Notice it has access to everything the researcher accumulated — no re-briefing needed.
 */
async function writerAgent(ctx: ACPMessage): Promise<string> {
  const { identity, intent, state } = ctx;

  console.log(`\n[writer] Received ACP context from: ${identity.agent_id}`);
  console.log(`[writer] Session: ${state.session_id} | Turn: ${state.turn_count}`);
  console.log(`[writer] Task: ${intent.action} | Confidence: ${state.metadata?.confidence}`);

  const prompt = `
You are a technical writer. A researcher (${identity.agent_id}) has completed their work and passed you the following context:

Topic: "${intent.target}"
Audience: ${intent.constraints?.audience ?? "general"}
Max length: ${intent.constraints?.max_length ?? 300} words
Research findings: ${JSON.stringify(intent.payload, null, 2)}
Researcher confidence: ${state.metadata?.confidence ?? "unknown"}
Sources checked: ${state.metadata?.sources_checked ?? "unknown"}

Write a clear, direct summary based on these findings. Do not re-research. Use what the researcher gave you.
  `.trim();

  const response = await claude.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

/**
 * The researcher agent does its work, then delegates to the writer with full context.
 */
async function researchAgent(topic: string): Promise<void> {
  console.log(`[researcher] Starting research on: "${topic}"`);

  // Simulate research work (in production: web search, API calls, etc.)
  const findings = {
    definition: `${topic} is a lightweight specification for how AI agents exchange context.`,
    key_points: [
      "Defines four fields: identity, state, memory, intent",
      "Transport agnostic — works over HTTP, WebSocket, message queues",
      "Model agnostic — Claude, GPT, Gemini, doesn't matter",
      "Solves the 'context dies at the boundary' problem",
    ],
    ecosystem_fit: "Complements MCP (tools) by handling agent-to-agent handoffs",
  };

  console.log(`[researcher] Research complete. Delegating to writer via ACP...`);

  // Show the ACP message being built
  const ctx = researcher.createContext(
    {
      action: "write_summary",
      target: topic,
      constraints: { audience: "technical developers", max_length: 250 },
      payload: findings,
    },
    {
      current_task: "research_complete",
      metadata: {
        sources_checked: 8,
        confidence: 0.92,
        dead_ends: ["tried MCP extension approach — doesn't fit"],
      },
    }
  );

  console.log("\n--- ACP Message (what gets passed to writer) ---");
  console.log(JSON.stringify(ctx, null, 2));
  console.log("---\n");

  // Delegate to writer — writer gets the FULL context, not just a string
  const summary = await researcher.delegate(
    writerAgent,
    ctx.intent,
    ctx.state
  );

  console.log("\n=== Final Output (from writer) ===");
  console.log(summary);
}

// Run it
researchAgent("the Agent Context Protocol").catch(console.error);
