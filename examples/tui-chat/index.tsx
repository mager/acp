/**
 * ACP TUI Example — Interactive Agent Team Chat
 * 
 * This example shows how to use the ACP SDK with a rich terminal UI.
 * Watch agents hand off to each other in real-time with full context visibility.
 * 
 * Run:
 *   ANTHROPIC_API_KEY=your_key npm run example:tui
 * 
 * Or with the CLI:
 *   ANTHROPIC_API_KEY=your_key npx acp
 */

import React from "react";
import { render } from "ink";
import { App } from "@mager/acp";

// Configure which agents to activate
const ACTIVE_AGENTS = ["magerbot", "genny"];

render(React.createElement(App, { agents: ACTIVE_AGENTS }));