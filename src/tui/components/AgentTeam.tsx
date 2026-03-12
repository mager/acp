import React from "react";
import { Box, Text } from "ink";
import { useACPStore, Agent } from "../store.js";

interface AgentTeamProps {
  activeAgents: string[];
}

const getStatusIndicator = (status: Agent["status"]) => {
  switch (status) {
    case "thinking":
      return { symbol: "◐", color: "yellow" };
    case "handing_off":
      return { symbol: "↳", color: "magenta" };
    default:
      return { symbol: "○", color: "gray" };
  }
};

export const AgentTeam: React.FC<AgentTeamProps> = ({ activeAgents }) => {
  const { agents } = useACPStore();

  // Filter to only active agents
  const activeAgentList = agents.filter((a) => activeAgents.includes(a.id));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold underline>Agent Team</Text>
      <Box flexDirection="column" marginTop={1}>
        {activeAgentList.map((agent) => {
          const status = getStatusIndicator(agent.status);
          return (
            <Box key={agent.id} marginY={1} flexDirection="column">
              <Box>
                <Text color={status.color as any}>{status.symbol} </Text>
                <Text bold color={agent.color as any}>
                  {agent.emoji} {agent.name}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text dimColor wrap="truncate-end">
                  {agent.capabilities.slice(0, 3).join(" · ")}
                </Text>
              </Box>
              {agent.status !== "idle" && (
                <Box marginLeft={2}>
                  <Text color={status.color as any} dimColor>
                    {agent.status}...
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};