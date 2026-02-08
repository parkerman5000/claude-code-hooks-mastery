import { useRef, useEffect } from "react";
import type { AgentMessage } from "../types";
import styles from "./AgentLog.module.css";

interface AgentLogProps {
  messages: AgentMessage[];
}

const ROLE_COLORS: Record<string, string> = {
  user: "#8b5cf6",
  assistant: "#00b4d8",
  tool: "#ff6b35",
};

export function AgentLog({ messages }: AgentLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <div className={styles.empty}>No messages yet...</div>;
  }

  return (
    <div className={styles.log}>
      {messages.map((msg, i) => (
        <div key={i} className={styles.entry}>
          <span
            className={styles.role}
            style={{ color: ROLE_COLORS[msg.role] || "#6b6b8d" }}
          >
            {msg.role}
          </span>
          <span className={styles.time}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          <div className={styles.content}>{msg.content}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
