import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  isLoading: boolean;
  messageCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isLoading, messageCount }) => {
  return (
    <Box borderStyle="single" paddingX={1}>
      {isLoading ? (
        <Text color="yellow">◐ Processing...</Text>
      ) : (
        <Text color="green">● Ready</Text>
      )}
      <Text> | Messages: {messageCount}</Text>
      <Text dimColor> | ? Help | H Context | Ctrl+R Reset | Esc Quit</Text>
    </Box>
  );
};