// Shared types for Butch Orchestrator — agents + hook events

export type AgentState = "idle" | "working" | "completed" | "failed" | "terminated";

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
}

export interface AgentCost {
  input: number;
  output: number;
  total: number;
}

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  model: string;
  state: AgentState;
  allowedTools: string[];
  systemPrompt?: string;
  workingDir?: string;
  createdAt: string;
  completedAt?: string;
  messages: AgentMessage[];
  toolCalls: number;
  contextUsage: number; // 0-100 percent
  cost: AgentCost;
  error?: string;
}

export interface CreateAgentRequest {
  name: string;
  prompt: string;
  model?: string;
  allowedTools?: string[];
  systemPrompt?: string;
  workingDir?: string;
}

export type AgentEventType =
  | "agent:created"
  | "agent:working"
  | "agent:message"
  | "agent:tool_call"
  | "agent:completed"
  | "agent:failed"
  | "agent:terminated";

export interface AgentEvent {
  type: AgentEventType;
  agent: Agent;
  timestamp: string;
}

// Hook event types (used by server)
export interface HookEvent {
  id: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
  chat?: unknown[];
  summary?: string;
  received_at: number;
}
