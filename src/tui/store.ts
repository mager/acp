import { create } from "zustand";
import { ACPMessage } from "../types.js";

export interface Message {
  id: string;
  agent_id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  acp_context?: ACPMessage;
  is_handoff?: boolean;
  handoff_from?: string;
  handoff_to?: string;
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  capabilities: string[];
  status: "idle" | "thinking" | "handing_off";
}

interface ACPStore {
  messages: Message[];
  agents: Agent[];
  activeAgentId: string | null;
  sessionId: string;
  inputValue: string;
  isLoading: boolean;
  
  // Actions
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setAgentStatus: (agentId: string, status: Agent["status"]) => void;
  setActiveAgent: (agentId: string | null) => void;
  setInputValue: (value: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetSession: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 9);

export const useACPStore = create<ACPStore>((set) => ({
  messages: [],
  agents: [
    { id: "magerbot", name: "magerbot", emoji: "⚡", color: "cyan", capabilities: ["code", "ops", "systems"], status: "idle" },
    { id: "genny", name: "genny", emoji: "🌿", color: "green", capabilities: ["health", "life", "travel"], status: "idle" },
    { id: "franklin", name: "franklin", emoji: "📚", color: "yellow", capabilities: ["research", "learning"], status: "idle" },
  ],
  activeAgentId: null,
  sessionId: `sess_${Date.now().toString(36)}`,
  inputValue: "",
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, id: generateId(), timestamp: new Date() },
      ],
    })),

  setAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status } : a
      ),
    })),

  setActiveAgent: (agentId) => set({ activeAgentId: agentId }),
  setInputValue: (value) => set({ inputValue: value }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  resetSession: () =>
    set({
      messages: [],
      sessionId: `sess_${Date.now().toString(36)}`,
      activeAgentId: null,
    }),
}));