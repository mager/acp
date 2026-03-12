import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useACPStore } from "../store.js";

interface InputBoxProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export const InputBox: React.FC<InputBoxProps> = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState("");
  const { setInputValue } = useACPStore();

  useInput((_input: string, key: { return: boolean }) => {
    if (key.return && input.trim() && !isLoading) {
      onSubmit(input);
      setInput("");
      setInputValue("");
    }
  });

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color="green">❯ </Text>
      {isLoading ? (
        <Text color="yellow">Agents are thinking...</Text>
      ) : (
        <TextInput
          value={input}
          onChange={(value: string) => {
            setInput(value);
            setInputValue(value);
          }}
          placeholder="Type a message..."
        />
      )}
    </Box>
  );
};