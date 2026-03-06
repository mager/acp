/**
 * ACP Example: magerbot + genny — a real two-agent team
 *
 * magerbot handles code/ops. genny handles health/life.
 * They communicate via ACP — full context, zero re-briefing.
 *
 * This is how @mager runs his actual agent stack.
 * Clone it. Rename the agents. Make it yours.
 *
 * Run: ANTHROPIC_API_KEY=your_key npx ts-node examples/magerbot-genny/index.ts
 */

import { Genny } from "./genny";
import { Magerbot } from "./magerbot";

async function main() {
  console.log("⚡ Starting agent team: magerbot + genny\n");
  console.log("=".repeat(50));

  // Wire up the team
  const genny = new Genny();
  const magerbot = new Magerbot(genny);

  // Ask magerbot something that spans both domains.
  // It'll handle the technical side, then pass to genny via ACP.
  const request = {
    action: "prepare_for_japan_trip",
    target: "japan_2026",
    payload: {
      departure: "April 20, 2026",
      return: "May 4, 2026",
      cities: ["Tokyo", "Kyoto", "Osaka"],
      flights_booked: true,
      accommodations_booked: true,
      budget_remaining_usd: 2500,
      current_fitness: "moderate — gym 3x/week",
      dietary_notes: "no restrictions",
    },
  };

  console.log(`\nRequest: "${request.action}"`);
  console.log("=".repeat(50));

  // magerbot is the entry point — it routes internally to genny via ACP
  const result = await magerbot.handle({
    acp_version: "0.1.0",
    identity: { agent_id: "user", capabilities: ["request"] },
    state: { session_id: "user-session", turn_count: 1 },
    memory: { retrieved: [] },
    intent: request,
  });

  console.log("\n" + "=".repeat(50));
  console.log("\n✅ Final output:\n");
  console.log(result);
}

main().catch(console.error);
