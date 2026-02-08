import type { Agent, AgentEvent, AgentEventType, AgentMessage, CreateAgentRequest } from "./types";

let sdkAvailable = false;
let queryFn: any = null;

try {
  const sdk = await import("@anthropic-ai/claude-agent-sdk");
  queryFn = sdk.query;
  sdkAvailable = true;
  console.log("[AgentManager] Claude Agent SDK loaded");
} catch {
  console.warn("[AgentManager] Claude Agent SDK not available — agent creation will be disabled");
}

function shortId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export class AgentManager {
  private agents = new Map<string, Agent>();
  private queries = new Map<string, { close: () => void }>();
  private broadcast: (message: string) => void;

  constructor(broadcast: (message: string) => void) {
    this.broadcast = broadcast;
  }

  private emitEvent(type: AgentEventType, agent: Agent) {
    const event: AgentEvent = { type, agent: { ...agent, messages: [...agent.messages] }, timestamp: new Date().toISOString() };
    this.broadcast(JSON.stringify(event));
  }

  createAgent(req: CreateAgentRequest): { agent?: Agent; error?: string } {
    if (!sdkAvailable) {
      return {
        error: "Claude Agent SDK not available. Install @anthropic-ai/claude-agent-sdk and set ANTHROPIC_API_KEY.",
      };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        error: "ANTHROPIC_API_KEY not set. Get one from https://console.anthropic.com/settings/keys",
      };
    }

    const id = shortId();
    const agent: Agent = {
      id,
      name: req.name || `agent-${id}`,
      prompt: req.prompt,
      model: req.model || "claude-sonnet-4-5-20250929",
      state: "idle",
      allowedTools: req.allowedTools || ["Read", "Glob", "Grep", "Bash"],
      systemPrompt: req.systemPrompt,
      createdAt: new Date().toISOString(),
      messages: [],
      toolCalls: 0,
      contextUsage: 0,
      cost: { input: 0, output: 0, total: 0 },
    };

    this.agents.set(id, agent);
    this.emitEvent("agent:created", agent);

    // Start the agent query in the background
    this.runAgent(agent);

    return { agent };
  }

  private async runAgent(agent: Agent) {
    try {
      agent.state = "working";
      this.emitEvent("agent:working", agent);

      const q = queryFn({
        prompt: agent.prompt,
        options: {
          allowedTools: agent.allowedTools,
          permissionMode: "acceptEdits",
          systemPrompt: agent.systemPrompt || `You are ${agent.name}, an agent in the Butch orchestrator system.`,
          model: agent.model,
          cwd: process.cwd(),
          maxTurns: 20,
        },
      });

      // Store reference for termination
      this.queries.set(agent.id, q);

      for await (const message of q) {
        // SDKAssistantMessage — the main content from Claude
        if (message.type === "assistant") {
          const betaMsg = message.message;
          // Extract text from content blocks
          let text = "";
          if (betaMsg?.content) {
            for (const block of betaMsg.content) {
              if (block.type === "text") {
                text += block.text;
              } else if (block.type === "tool_use") {
                agent.toolCalls++;
                const toolMsg: AgentMessage = {
                  role: "tool",
                  content: `Tool: ${block.name}`,
                  timestamp: new Date().toISOString(),
                };
                agent.messages.push(toolMsg);
                this.emitEvent("agent:tool_call", agent);
              }
            }
          }

          if (text) {
            const agentMsg: AgentMessage = {
              role: "assistant",
              content: text,
              timestamp: new Date().toISOString(),
            };
            agent.messages.push(agentMsg);
            this.emitEvent("agent:message", agent);
          }

          // Track usage from the beta message
          if (betaMsg?.usage) {
            agent.cost.input = betaMsg.usage.input_tokens || agent.cost.input;
            agent.cost.output = betaMsg.usage.output_tokens || agent.cost.output;
            agent.cost.total = agent.cost.input + agent.cost.output;
          }
        }

        // SDKResultMessage — final result with cost summary
        else if (message.type === "result") {
          if (message.usage) {
            agent.cost.input = message.usage.input_tokens || agent.cost.input;
            agent.cost.output = message.usage.output_tokens || agent.cost.output;
            agent.cost.total = agent.cost.input + agent.cost.output;
          }

          if (message.subtype === "success") {
            if (message.result) {
              const resultMsg: AgentMessage = {
                role: "assistant",
                content: message.result,
                timestamp: new Date().toISOString(),
              };
              agent.messages.push(resultMsg);
            }
          } else {
            // Error result
            agent.error = message.subtype;
            if ("errors" in message && message.errors?.length) {
              agent.error = message.errors.join("; ");
            }
          }
        }

        // SDKSystemMessage — init info
        else if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          const initMsg: AgentMessage = {
            role: "assistant",
            content: `Initialized: model=${(message as any).model}, tools=[${(message as any).tools?.join(", ") || ""}]`,
            timestamp: new Date().toISOString(),
          };
          agent.messages.push(initMsg);
          this.emitEvent("agent:message", agent);
        }

        // SDKToolProgressMessage
        else if (message.type === "tool_progress") {
          const toolName = (message as any).tool_name || "unknown";
          const elapsed = (message as any).elapsed_time_seconds || 0;
          if (elapsed > 2) {
            // Only log slow tools
            const progressMsg: AgentMessage = {
              role: "tool",
              content: `${toolName} running (${elapsed.toFixed(0)}s)...`,
              timestamp: new Date().toISOString(),
            };
            agent.messages.push(progressMsg);
            this.emitEvent("agent:message", agent);
          }
        }
      }

      // Query finished
      if (agent.state === "working") {
        agent.state = agent.error ? "failed" : "completed";
        agent.completedAt = new Date().toISOString();
        this.emitEvent(agent.error ? "agent:failed" : "agent:completed", agent);
      }
    } catch (err: any) {
      if (agent.state === "terminated") return; // Expected
      agent.state = "failed";
      agent.error = err.message || String(err);
      agent.completedAt = new Date().toISOString();
      this.emitEvent("agent:failed", agent);
    } finally {
      this.queries.delete(agent.id);
    }
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  terminateAgent(id: string): { success: boolean; error?: string } {
    const agent = this.agents.get(id);
    if (!agent) return { success: false, error: "Agent not found" };

    const q = this.queries.get(id);
    if (q) {
      try { q.close(); } catch {}
    }

    agent.state = "terminated";
    agent.completedAt = new Date().toISOString();
    this.emitEvent("agent:terminated", agent);
    return { success: true };
  }

  terminateAll(): { terminated: number } {
    let count = 0;
    for (const [id, agent] of this.agents) {
      if (agent.state === "working" || agent.state === "idle") {
        this.terminateAgent(id);
        count++;
      }
    }
    return { terminated: count };
  }
}
