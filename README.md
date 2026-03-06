# ACP — Agent Context Protocol

Build agent teams. Not chatbot pipelines.

`@mager/acp` is a lightweight SDK for wiring multiple AI agents together — each with a clear domain, passing full context between them. Model-agnostic. Framework-agnostic. No infra required.

## The Idea

One agent can't do everything well. But three specialized agents that actually *talk to each other* can.

```
user → magerbot (code/ops) → genny (health/life)
                ↓                      ↓
          handles infra          builds the protocol
          flags handoff          picks up in context
```

Zero re-briefing. Zero context loss. The second agent knows everything the first one did.

## Install

```bash
npm install @mager/acp
```

## Build Your First Agent

Extend `ACPAgent`. Override `handle()`. That's it.

```ts
import { ACPAgent, ACPMessage } from "@mager/acp";
import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic();

class ResearchAgent extends ACPAgent {
  constructor() {
    super({
      id: "researcher",
      capabilities: ["search", "analyze", "summarize"],
      systemPrompt: "You are a research agent. Be thorough and cite your reasoning.",
    });
  }

  async handle(ctx: ACPMessage): Promise<string> {
    const { intent, state } = ctx;
    // ctx has everything: who sent it, what they want, session state, memory
    const response = await claude.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      system: this.systemPrompt,
      messages: [{ role: "user", content: `Research: ${intent.target}` }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
```

## Wire Two Agents Together

```ts
class WriterAgent extends ACPAgent {
  constructor() {
    super({ id: "writer", capabilities: ["write", "edit"] });
  }

  async handle(ctx: ACPMessage): Promise<string> {
    // Full context from the researcher — findings, confidence, dead ends
    const { intent, state, identity } = ctx;
    const response = await claude.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Write a summary of: ${intent.target}
Research findings: ${JSON.stringify(intent.payload)}
Confidence: ${state.metadata?.confidence}
Handed off by: ${identity.agent_id}`,
      }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

// Wire them up
const writer = new WriterAgent();
const researcher = new ResearchAgent();

// researcher delegates to writer — passes ACPAgent instance directly
const result = await researcher.delegate(writer, {
  action: "write_summary",
  target: "the Agent Context Protocol",
  payload: { key_finding: "context dies at the boundary without ACP" },
}, {
  current_task: "research_complete",
  metadata: { confidence: 0.92, sources_checked: 8 },
});
```

## The ACP Envelope

Every handoff carries four things:

| Field | What it carries |
|-------|----------------|
| **identity** | Who sent this? What can they do? |
| **state** | Session ID, turn count, current task, custom metadata |
| **memory** | Long-term facts and preferences |
| **intent** | Action, target, constraints, payload |

```json
{
  "acp_version": "0.1.0",
  "identity": { "agent_id": "magerbot", "capabilities": ["code", "ops"] },
  "state": { "session_id": "sess_abc123", "turn_count": 3, "metadata": { "confidence": 0.92 } },
  "memory": { "retrieved": [{ "key": "user_timezone", "value": "America/Chicago" }] },
  "intent": { "action": "plan_trip_health_protocol", "target": "japan_2026", "payload": {} }
}
```

## Real-World Example: magerbot + genny

The reference implementation — two real agents that run my personal stack:

- **magerbot** — code, ops, infra. Thinks in systems.
- **genny** — health, travel, goals. Thinks in decades.

When I ask magerbot to prep for a trip, it handles the logistics, then hands off to genny via ACP with everything it already knows. No re-briefing. Genny picks up mid-stride.

```bash
git clone https://github.com/mager/acp
cd acp && npm install
ANTHROPIC_API_KEY=your_key npx ts-node examples/magerbot-genny/index.ts
```

## API

### `new ACPAgent(options)`

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique agent identifier |
| `capabilities` | `string[]` | What this agent can do |
| `vendor` | `string?` | Optional org/team name |
| `systemPrompt` | `string?` | System prompt for the agent |

### `agent.handle(ctx: ACPMessage): Promise<string>`
Override this. Receives the full ACP context. Return a string.

### `agent.createContext(intent, state?, memory?)`
Build an ACP message to send to another agent.

### `agent.delegate(target, intent, state?, memory?)`
Pass an `ACPAgent` instance or handler function. Builds context, calls `target.handle(ctx)` automatically.

### `agent.parseContext(raw)`
Validate + parse an incoming ACP message. Throws on invalid input.

## Why Not MCP?

- MCP is for connecting agents to **tools** (databases, APIs, functions)
- ACP is for connecting agents to **agents** (full context, state, identity, intent)
- They're complementary — use both

## Roadmap

- [x] TypeScript SDK
- [x] `handle()` + `delegate()` agent pattern
- [x] Basic two-agent example
- [x] magerbot + genny reference implementation
- [ ] Python port
- [ ] HTTP transport helpers (call agents across services)
- [ ] JSON Schema spec
- [ ] Agent registry (discover agents by capability)

## License

MIT — [mager](https://x.com/mager)
