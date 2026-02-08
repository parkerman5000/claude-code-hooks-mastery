import { useState, useEffect, useRef, useCallback } from "react";
import type { HookEvent, WebSocketMessage } from "../types";

const MAX_EVENTS = 500;

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (e) => {
      const msg: WebSocketMessage = JSON.parse(e.data);
      if (msg.type === "initial") {
        const initial = Array.isArray(msg.data) ? msg.data : [];
        setEvents(initial.slice(-MAX_EVENTS));
      } else if (msg.type === "event") {
        setEvents((prev) => {
          const next = [...prev, msg.data as HookEvent];
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

  return { events, isConnected, clearEvents };
}
