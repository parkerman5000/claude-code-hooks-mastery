import type { Server, ServerWebSocket } from "bun";
import { AgentManager } from "./agent-manager";
import type { HookEvent } from "./types";

const MAX_EVENTS = 500;
const events: HookEvent[] = [];
let nextId = 1;
const wsClients = new Set<ServerWebSocket<unknown>>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function broadcast(message: string) {
  for (const ws of wsClients) {
    ws.send(message);
  }
}

const agentManager = new AgentManager(broadcast);

function jsonResponse(data: any, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

const server = Bun.serve({
  port: 4000,
  hostname: "0.0.0.0",

  fetch(req: Request, server: Server) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // --- Hook Event endpoints ---

    if (url.pathname === "/events" && req.method === "POST") {
      return handlePostEvent(req);
    }

    if (url.pathname === "/events" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "0");
      const data = limit > 0 ? events.slice(-limit) : events;
      return jsonResponse(data);
    }

    // --- Agent endpoints ---

    if (url.pathname === "/agents" && req.method === "POST") {
      return handleCreateAgent(req);
    }

    if (url.pathname === "/agents" && req.method === "GET") {
      return jsonResponse(agentManager.getAllAgents());
    }

    if (url.pathname === "/agents" && req.method === "DELETE") {
      return jsonResponse(agentManager.terminateAll());
    }

    // /agents/:id routes
    const agentMatch = url.pathname.match(/^\/agents\/([^/]+)$/);
    if (agentMatch) {
      const id = agentMatch[1];

      if (req.method === "GET") {
        const agent = agentManager.getAgent(id);
        if (!agent) return jsonResponse({ error: "Agent not found" }, 404);
        return jsonResponse(agent);
      }

      if (req.method === "DELETE") {
        const result = agentManager.terminateAgent(id);
        if (!result.success) return jsonResponse({ error: result.error }, 404);
        return jsonResponse({ success: true });
      }
    }

    // /agents/:id/command
    const commandMatch = url.pathname.match(/^\/agents\/([^/]+)\/command$/);
    if (commandMatch && req.method === "POST") {
      return handleAgentCommand(req, commandMatch[1]);
    }

    return new Response("Butch Orchestrator Server", { headers: corsHeaders });
  },

  websocket: {
    open(ws: ServerWebSocket<unknown>) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: "initial", data: events }));
      // Send current agent state to new connections
      for (const agent of agentManager.getAllAgents()) {
        ws.send(JSON.stringify({ type: "agent:created", agent, timestamp: agent.createdAt }));
      }
    },
    close(ws: ServerWebSocket<unknown>) {
      wsClients.delete(ws);
    },
    error(ws: ServerWebSocket<unknown>) {
      wsClients.delete(ws);
    },
    message() {},
  },
});

async function handlePostEvent(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    if (!body.source_app || !body.session_id || !body.hook_event_type || !body.payload) {
      return jsonResponse(
        { error: "Missing required fields: source_app, session_id, hook_event_type, payload" },
        400
      );
    }

    const event: HookEvent = {
      id: nextId++,
      source_app: body.source_app,
      session_id: body.session_id,
      hook_event_type: body.hook_event_type,
      payload: body.payload,
      timestamp: body.timestamp,
      chat: body.chat,
      summary: body.summary,
      received_at: Date.now(),
    };

    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }

    broadcast(JSON.stringify({ type: "event", data: event }));

    return jsonResponse(event, 201);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
}

async function handleCreateAgent(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    if (!body.prompt) {
      return jsonResponse({ error: "Missing required field: prompt" }, 400);
    }

    const result = agentManager.createAgent({
      name: body.name || `agent-${Date.now()}`,
      prompt: body.prompt,
      model: body.model,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 503);
    }

    return jsonResponse(result.agent, 201);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
}

async function handleAgentCommand(_req: Request, id: string): Promise<Response> {
  const agent = agentManager.getAgent(id);
  if (!agent) return jsonResponse({ error: "Agent not found" }, 404);
  // Command sending will be implemented when SDK interaction model is clearer
  return jsonResponse({ error: "Agent commands not yet implemented" }, 501);
}

console.log(`Butch Orchestrator Server running on http://0.0.0.0:${server.port}`);
