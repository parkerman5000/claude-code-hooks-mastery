import type { Server, ServerWebSocket } from "bun";

interface HookEvent {
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

const MAX_EVENTS = 500;
const events: HookEvent[] = [];
let nextId = 1;
const wsClients = new Set<ServerWebSocket<unknown>>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function broadcast(message: string) {
  for (const ws of wsClients) {
    ws.send(message);
  }
}

const server = Bun.serve({
  port: 4000,

  fetch(req: Request, server: Server) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/events" && req.method === "POST") {
      return handlePostEvent(req);
    }

    if (url.pathname === "/events" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "0");
      const data = limit > 0 ? events.slice(-limit) : events;
      return Response.json(data, { headers: corsHeaders });
    }

    return new Response("Claude Code Observability Server", { headers: corsHeaders });
  },

  websocket: {
    open(ws: ServerWebSocket<unknown>) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: "initial", data: events }));
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
      return Response.json(
        { error: "Missing required fields: source_app, session_id, hook_event_type, payload" },
        { status: 400, headers: corsHeaders }
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

    return Response.json(event, { status: 201, headers: corsHeaders });
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }
}

console.log(`Observability server running on http://localhost:${server.port}`);
