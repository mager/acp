import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { useACPStore } from "./store.js";
import { AgentTeam } from "./components/AgentTeam.js";
import { MessageList } from "./components/MessageList.js";
import { InputBox } from "./components/InputBox.js";
import { StatusBar } from "./components/StatusBar.js";
import { ACPAgentRunner } from "./agent-runner.js";

interface AppProps {
  agents: string[];
}

export const App: React.FC<AppProps> = ({ agents }) => {
  const { exit } = useApp();
  const [showHelp, setShowHelp] = useState(false);
  const [showHandoffPanel, setShowHandoffPanel] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  
  const {
    messages,
    sessionId,
    isLoading,
    addMessage,
    setIsLoading,
    setAgentStatus,
    resetSession,
  } = useACPStore();

  // Initialize agent runner
  const runner = new ACPAgentRunner(agents);

  // Handle user input submission
  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim()) return;
    
    // Add user message
    addMessage({
      agent_id: "user",
      role: "user",
      content: input,
    });
    
    setIsLoading(true);
    
    try {
      // Run through agent team
      const result = await runner.process(input, {
        onAgentStart: (agentId) => {
          setAgentStatus(agentId, "thinking");
          addMessage({
            agent_id: agentId,
            role: "system",
            content: `${agentId} is thinking...`,
          });
        },
        onAgentHandoff: (from, to, context) => {
          setAgentStatus(from, "idle");
          setAgentStatus(to, "handing_off");
          addMessage({
            agent_id: "system",
            role: "system",
            content: `↳ Handoff: ${from} → ${to}`,
            is_handoff: true,
            handoff_from: from,
            handoff_to: to,
            acp_context: context,
          });
        },
        onAgentComplete: (agentId, response, acpContext) => {
          setAgentStatus(agentId, "idle");
          addMessage({
            agent_id: agentId,
            role: "agent",
            content: response,
            acp_context: acpContext,
          });
        },
      });
      
      // Final response if not already added
      if (result && !messages.find(m => m.content === result)) {
        addMessage({
          agent_id: runner.getCurrentAgent(),
          role: "agent",
          content: result,
        });
      }
    } catch (error) {
      addMessage({
        agent_id: "system",
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading, setAgentStatus, runner, messages]);

  // Keyboard shortcuts
  useInput((input: string, key: { escape: boolean; ctrl: boolean; return: boolean }) => {
    if (key.escape) {
      if (showHelp) setShowHelp(false);
      else if (showHandoffPanel) setShowHandoffPanel(false);
      else exit();
    }
    if (input === "?") setShowHelp(!showHelp);
    if (input === "h") setShowHandoffPanel(!showHandoffPanel);
    if (input === "r" && key.ctrl) {
      resetSession();
      addMessage({
        agent_id: "system",
        role: "system",
        content: "Session reset. Starting fresh...",
      });
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="cyan">
          ⚡ ACP Agent Team TUI
        </Text>
        <Text> | Session: {sessionId.slice(0, 12)}...</Text>
        <Text dimColor> | Press ? for help</Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Sidebar - Agent Team */}
        <Box width={25} borderStyle="single" flexDirection="column">
          <AgentTeam activeAgents={agents} />
        </Box>

        {/* Main chat area */}
        <Box flexGrow={1} flexDirection="column">
          <MessageList 
            messages={messages} 
            selectedIndex={selectedMessage}
            onSelect={setSelectedMessage}
          />
        </Box>

        {/* Handoff panel (toggle with 'h') */}
        {showHandoffPanel && (
          <Box width={40} borderStyle="single" flexDirection="column" paddingX={1}>
            <Text bold underline>ACP Context Panel</Text>
            {selectedMessage !== null && messages[selectedMessage]?.acp_context ? (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>Version: {messages[selectedMessage].acp_context!.acp_version}</Text>
                <Text color="cyan">From: {messages[selectedMessage].acp_context!.identity.agent_id}</Text>
                <Text>Action: {messages[selectedMessage].acp_context!.intent.action}</Text>
                <Text dimColor>Session: {messages[selectedMessage].acp_context!.state.session_id.slice(0, 8)}...</Text>
                <Text dimColor>Turn: {messages[selectedMessage].acp_context!.state.turn_count}</Text>
                <Box marginTop={1}>
                  <Text dimColor>Payload:</Text>
                </Box>
                <Text wrap="wrap" dimColor>
                  {JSON.stringify(messages[selectedMessage].acp_context!.intent.payload, null, 2).slice(0, 200)}...
                </Text>
              </Box>
            ) : (
              <Text dimColor>Select a message to view ACP context</Text>
            )}
          </Box>
        )}
      </Box>

      {/* Input area */}
      <InputBox onSubmit={handleSubmit} isLoading={isLoading} />

      {/* Status bar */}
      <StatusBar isLoading={isLoading} messageCount={messages.length} />

      {/* Help overlay */}
      {showHelp && (
        <Box
          marginTop={3}
          marginLeft={4}
          width="80%"
          borderStyle="double"
          padding={1}
        >
          <Box flexDirection="column">
            <Text bold>Keyboard Shortcuts</Text>
            <Text>Enter - Send message</Text>
            <Text>Ctrl+R - Reset session</Text>
            <Text>H - Toggle ACP context panel</Text>
            <Text>↑/↓ - Navigate message history</Text>
            <Text>? - Toggle this help</Text>
            <Text>Esc - Close panel / Quit</Text>
            <Box marginTop={1}>
              <Text dimColor>Press any key to close</Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};