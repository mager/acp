# ACP — Agent Context Protocol

A lightweight standard for agent-to-agent context passing. Model-agnostic. Framework-agnostic. No infra required.

## The Problem

When agents hand off to each other, context dies at the boundary. Agent B gets a string. It starts from zero. Repeats work. Makes different assumptions.

ACP fixes this by defining a standard envelope for everything an agent needs to pass on.

## Install

```bash
npm install @mager/acp
```

## Quick Start

```ts
import { ACPAgent, ACPMessage } from "@mager/acp";
import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic();

const researcher = new ACPAgent({
  id: "researcher",
  capabilities: ["search", "analyze"],
});

// Agent B receives the full ACP context — not just a string
async function writerAgent(ctx: ACPMessage): Promise<string> {
  const { identity, intent, state } = ctx;
  // Use ctx.intent.payload, ctx.state.metadata, ctx.memory — all intact
  const response = await claude.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Write a summary about "${intent.target}". 
Findings: ${JSON.stringify(intent.payload)}
Confidence: ${state.metadata?.confidence}`
    }]
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

// Agent A delegates to Agent B with full context
const result = await researcher.delegate(
  writerAgent,
  {
    action: "write_summary",
    target: "the Agent Context Protocol",
    payload: { key_finding: "context dies at the boundary without ACP" },
  },
  {
    current_task: "research_complete",
    metadata: { confidence: 0.92, sources_checked: 8 },
  }
);
```

## Core Concepts

| Field | Purpose |
|-------|---------|
| **Identity** | Who is this agent? What can it do? |
| **State** | Session-scoped data accumulated so far |
| **Memory** | Long-term facts and preferences |
| **Intent** | What the caller wants done |

## API

### `new ACPAgent(options)`

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique agent identifier |
| `vendor` | `string?` | Optional org/team name |
| `capabilities` | `string[]` | What this agent can do |

### `agent.createContext(intent, state?, memory?)`

Builds a valid `ACPMessage` with auto-managed `session_id` and `turn_count`.

### `agent.parseContext(raw)`

Validates and parses an incoming ACP message. Throws on invalid input.

### `agent.delegate(targetAgent, intent, state?, memory?)`

Builds context and calls `targetAgent(ctx)`. Returns whatever the target returns.

### `agent.newSession()`

Resets `session_id` and `turn_count` for a fresh conversation.

## Why Not MCP?

- **MCP** defines how to call a tool. **ACP** defines how agents talk to each other.
- MCP is for connecting agents to functions. ACP is for connecting agents to agents.
- They're complementary — an MCP server can expose a tool that speaks ACP.

## Run the Example

```bash
git clone https://github.com/mager/acp
cd acp
npm install
ANTHROPIC_API_KEY=your_key npm run example
```

## Roadmap

- [x] TypeScript core
- [x] Plain Claude example
- [ ] Python port
- [ ] JSON Schema spec
- [ ] Agent registry (discover by capability)
- [ ] Signed identity attestations

## License

MIT — [mager](https://x.com/mager)
