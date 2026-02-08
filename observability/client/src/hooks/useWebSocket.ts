import { useState, useEffect, useRef, useCallback } from "react";
import type { HookEvent, WebSocketMessage, Agent, AgentEvent, AgentEventType } from "../types";

const MAX_EVENTS = 500;

const AGENT_EVENT_TYPES: AgentEventType[] = [
  "agent:created", "agent:working", "agent:message",
  "agent:tool_call", "agent:completed", "agent:failed", "agent:terminated",
];

function isAgentEvent(msg: any): msg is AgentEvent {
  return msg.type && AGENT_EVENT_TYPES.includes(msg.type);
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      // Handle agent events
      if (isAgentEvent(msg)) {
        setAgents((prev) => {
          const idx = prev.findIndex((a) => a.id === msg.agent.id);
          if (msg.type === "agent:created" && idx === -1) {
            return [...prev, msg.agent];
          }
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = msg.agent;
            return next;
          }
          return [...prev, msg.agent];
        });
        return;
      }

      // Handle hook events (existing)
      const hookMsg = msg as WebSocketMessage;
      if (hookMsg.type === "initial") {
        const initial = Array.isArray(hookMsg.data) ? hookMsg.data : [];
        setEvents(initial.slice(-MAX_EVENTS));
      } else if (hookMsg.type === "event") {
        setEvents((prev) => {
          const next = [...prev, hookMsg.data as HookEvent];
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, agents, isConnected, clearEvents };
}
