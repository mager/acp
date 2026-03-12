import React, { useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useACPStore, Message } from "../store.js";

interface MessageListProps {
  messages: Message[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

const getRoleColor = (role: Message["role"], agentId: string) => {
  if (role === "user") return "green";
  if (role === "system") return "gray";
  
  // Agent colors
  const agentColors: Record<string, string> = {
    magerbot: "cyan",
    genny: "green",
    franklin: "yellow",
  };
  return agentColors[agentId] || "blue";
};

const getRoleEmoji = (role: Message["role"], agentId: string) => {
  if (role === "user") return "👤";
  if (role === "system") return "⚙️";
  
  const agentEmojis: Record<string, string> = {
    magerbot: "⚡",
    genny: "🌿",
    franklin: "📚",
  };
  return agentEmojis[agentId] || "🤖";
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  selectedIndex,
  onSelect,
}) => {
  const scrollRef = useRef<number>(0);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current = Math.max(0, messages.length - 10);
  }, [messages.length]);

  // Navigation
  useInput((_input: string, key: { upArrow: boolean; downArrow: boolean }) => {
    if (key.upArrow && selectedIndex !== null && selectedIndex > 0) {
      onSelect(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex !== null && selectedIndex < messages.length - 1) {
      onSelect(selectedIndex + 1);
    }
  });

  const visibleMessages = messages.slice(scrollRef.current);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {visibleMessages.length === 0 ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          <Text dimColor>Welcome to ACP Agent Team TUI</Text>
          <Text dimColor>Type a message to start chatting with your agents</Text>
          <Box marginTop={1}>
            <Text dimColor>Press ? for help</Text>
          </Box>
        </Box>
      ) : (
        visibleMessages.map((msg, idx) => {
          const actualIndex = scrollRef.current + idx;
          const isSelected = selectedIndex === actualIndex;
          const color = getRoleColor(msg.role, msg.agent_id);
          const emoji = getRoleEmoji(msg.role, msg.agent_id);

          return (
            <Box
              key={msg.id}
              flexDirection="column"
              marginY={1}
              borderStyle={isSelected ? "single" : undefined}
              paddingX={isSelected ? 1 : 0}
            >
              <Box>
                <Text color={color as any}>
                  {emoji} <Text bold>{msg.agent_id}</Text>
                </Text>
                <Text dimColor>
                  {" "}
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                {msg.is_handoff && (
                  <Text color="magenta"> [HANDOFF]</Text>
                )}
                {msg.acp_context && !msg.is_handoff && (
                  <Text color="cyan"> [ACP]</Text>
                )}
              </Box>
              <Box marginLeft={2}>
                <Text wrap="wrap">{msg.content}</Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};