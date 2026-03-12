#!/usr/bin/env node
/**
 * ACP TUI — Agent Context Protocol Terminal Interface
 * 
 * Interactive chat with agent teams. Watch handoffs happen in real-time.
 * 
 * Usage:
 *   ANTHROPIC_API_KEY=xxx npx acp
 *   ANTHROPIC_API_KEY=xxx npx acp --agents magerbot,genny
 */

import React from "react";
import { render } from "ink";
import { App } from "./tui/App.js";

// Parse CLI args
const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith("--agents="));
const agents = agentArg?.split("=")[1]?.split(",") || ["magerbot", "genny"];

render(React.createElement(App, { agents }));