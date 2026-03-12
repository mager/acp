# ACP — Agent Context Protocol

Build agent teams. Not chatbot pipelines.

`@mager/acp` is a lightweight SDK for wiring multiple AI agents together — each with a clear domain, passing full context between them. Now with a **rich TUI** for interactive agent chat.

## What's New: TUI Mode 🖥️

The SDK now includes a full terminal UI built with [Ink](https://github.com/vadimdemedes/ink) (React for terminals). Watch your agents think, hand off, and collaborate in real-time.

```bash
# Run the interactive TUI
ANTHROPIC_API_KEY=your_key npx acp

# Or with specific agents
ANTHROPIC_API_KEY=your_key npx acp --agents=magerbot,genny,franklin
```

![ACP TUI Demo](https://github.com/mager/acp/raw/main/assets/tui-demo.gif)

### TUI Features

- **Live Agent Status** — See which agent is thinking, idle, or handing off
- **Handoff Visualization** — Watch context pass between agents with visual indicators
- **ACP Context Panel** — Inspect the full context envelope at any handoff (press `H`)
- **Message Navigation** — Scroll through conversation history with arrow keys
- **Session Management** — Reset with `Ctrl+R`, quit with `Esc`

## The Idea

One agent can't do everything well. But three specialized agents that actually *talk to each other* can.

```
┌─────────┐     ACP Context Envelope      ┌─────────┐
│         │ ─────────────────────────────→│         │
│magerbot │  identity, state, memory,     │  genny  │
│  ⚡      │  intent — nothing lost        │  🌿     │
│         │←──────────────────────────────│         │
└─────────┘                               └─────────┘
   ↓                                           ↓
code/ops                                health/life
```

Zero re-briefing. Zero context loss. The second agent knows everything the first one did.

## Quick Start

### 1. Install

```bash
npm install @mager/acp
```

### 2. Run the TUI

```bash
export ANTHROPIC_API_KEY=your_key
npx acp
```

### 3. Or use the SDK programmatically

```ts
import { ACPAgent, ACPMessage } from "@mager/acp";
import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic();

class ResearchAgent extends ACPAgent {
  constructor() {
    super({
      id: "researcher",
      capabilities: ["search", "analyze", "summarize"],
      systemPrompt: "You are a research agent. Be thorough.",
    });
  }

  async handle(ctx: ACPMessage): Promise<string> {
    const { intent, state, identity } = ctx;
    // Full context available: who sent it, session state, memory
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
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
    const { intent, state, identity } = ctx;
    // Writer gets FULL context from researcher
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Write a summary about "${intent.target}".
Research: ${JSON.stringify(intent.payload)}
Confidence: ${state.metadata?.confidence}
Handed off by: ${identity.agent_id}`,
      }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

const writer = new WriterAgent();
const researcher = new ResearchAgent();

// Delegate with full context
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
  "acp_version": "0.2.0",
  "identity": { "agent_id": "magerbot", "capabilities": ["code", "ops"] },
  "state": { 
    "session_id": "sess_abc123", 
    "turn_count": 3, 
    "current_task": "research_complete",
    "metadata": { "confidence": 0.92 } 
  },
  "memory": { "retrieved": [{ "key": "user_timezone", "value": "America/Chicago" }] },
  "intent": { 
    "action": "plan_trip_health_protocol", 
    "target": "japan_2026", 
    "payload": { "cities": ["Tokyo", "Kyoto"] }
  }
}
```

## TUI Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `↑/↓` | Navigate message history |
| `H` | Toggle ACP context panel |
| `?` | Show/hide help |
| `Ctrl+R` | Reset session |
| `Esc` | Close panel / Quit |

## Real-World Example: magerbot + genny

The reference implementation — two real agents that run my personal stack:

```bash
git clone https://github.com/mager/acp
cd acp && npm install

# Run the TUI with the real agent team
ANTHROPIC_API_KEY=your_key npx acp --agents=magerbot,genny

# Or run the programmatic example
ANTHROPIC_API_KEY=your_key npx ts-node examples/magerbot-genny/index.ts
```

## Programmatic TUI

Build your own TUI by importing the components:

```tsx
import React from "react";
import { render } from "ink";
import { App, ACPAgentRunner } from "@mager/acp";

const MyApp = () => {
  const runner = new ACPAgentRunner(["researcher", "writer"]);
  
  return <App agents={["researcher", "writer"]} />;
};

render(<MyApp />);
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

### `new ACPAgentRunner(agentIds: string[])`
Create a runner that orchestrates multiple agents with real-time TUI updates.

### `ACPAgentRunner.process(input, callbacks)`
Process user input through the agent team. Callbacks receive real-time updates:
- `onAgentStart(agentId)` — Agent started thinking
- `onAgentHandoff(from, to, context)` — Context passed between agents
- `onAgentComplete(agentId, response, acpContext)` — Agent finished

## Why Not MCP?

- **MCP** is for connecting agents to **tools** (databases, APIs, functions)
- **ACP** is for connecting **agents to agents** (full context, state, identity, intent)
- They're complementary — use both

## Changelog

### v0.2.0 — TUI Release
- ✨ Full terminal UI with Ink/React
- ✨ Real-time agent status visualization
- ✨ Interactive ACP context inspector
- ✨ Streaming Claude responses
- ✨ CLI entry point: `npx acp`

### v0.1.0 — Initial Release
- Core ACPAgent class
- Context envelope (identity, state, memory, intent)
- Basic delegation pattern
- magerbot + genny reference implementation

## Roadmap

- [x] TypeScript SDK
- [x] `handle()` + `delegate()` agent pattern
- [x] Basic two-agent example
- [x] magerbot + genny reference implementation
- [x] **TUI with Ink/React** ← You are here
- [x] Streaming responses
- [x] CLI entry point
- [ ] HTTP transport helpers (call agents across services)
- [ ] Python port
- [ ] JSON Schema spec
- [ ] Agent registry (discover agents by capability)

## License

MIT — [mager](https://x.com/mager)