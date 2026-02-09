export type HookEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "UserPromptSubmit"
  | "Notification"
  | "PermissionRequest"
  | "Stop"
  | "SessionStart"
  | "SessionEnd"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact"
  | "Setup";

export interface HookEvent {
  id: number;
  source_app: string;
  session_id: string;
  hook_event_type: HookEventType;
  payload: Record<string, unknown>;
  timestamp?: number;
  chat?: unknown[];
  summary?: string;
  received_at: number;
}

export interface WebSocketMessage {
  type: "initial" | "event";
  data: HookEvent | HookEvent[];
}

// Merged palette: mpowerio.ai synapse spark + Butch gradients + dashboard purple
export const EVENT_TYPE_COLORS: Record<string, string> = {
  PreToolUse: "#00b4d8",      // mpowerio cyan
  PostToolUse: "#00f5a0",     // mpowerio mint
  PostToolUseFailure: "#ef4444",
  UserPromptSubmit: "#8b5cf6", // purple (your fav)
  Notification: "#ffc107",     // mpowerio gold
  PermissionRequest: "#ff6b35", // mpowerio orange
  Stop: "#6b6b8d",
  SessionStart: "#22c55e",
  SessionEnd: "#6366f1",
  SubagentStart: "#14b8a6",
  SubagentStop: "#0ea5e9",
  PreCompact: "#ec4899",
  Setup: "#7b2cbf",           // mpowerio purple
};

export const EVENT_TYPE_EMOJIS: Record<string, string> = {
  PreToolUse: "🔧",
  PostToolUse: "✅",
  PostToolUseFailure: "❌",
  UserPromptSubmit: "💬",
  Notification: "🔔",
  PermissionRequest: "🔐",
  Stop: "🛑",
  SessionStart: "🚀",
  SessionEnd: "🏁",
  SubagentStart: "👥",
  SubagentStop: "🤖",
  PreCompact: "📦",
  Setup: "⚙️",
};

// --- Agent types ---

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
  contextUsage: number;
  cost: AgentCost;
  error?: string;
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

export const AGENT_STATE_COLORS: Record<AgentState, string> = {
  idle: "#6b6b8d",
  working: "#00b4d8",
  completed: "#22c55e",
  failed: "#ef4444",
  terminated: "#ff6b35",
};
