import { useState } from "react";
import type { HookEvent } from "../types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS } from "../types";
import styles from "./EventCard.module.css";

interface EventCardProps {
  event: HookEvent;
  isSelected: boolean;
  isNew: boolean;
  onSelect: (event: HookEvent) => void;
}

function formatTime(ts?: number): string {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function getToolInfo(event: HookEvent): { tool: string; detail?: string } | null {
  const payload = event.payload;

  if (event.hook_event_type === "UserPromptSubmit" && payload.prompt) {
    const prompt = String(payload.prompt);
    return { tool: "Prompt", detail: prompt.slice(0, 80) + (prompt.length > 80 ? "..." : "") };
  }
  if (event.hook_event_type === "SessionStart") {
    return { tool: "Session", detail: String(payload.source || "started") };
  }
  if (event.hook_event_type === "PreCompact") {
    return { tool: "Compaction", detail: payload.trigger === "manual" ? "Manual" : "Auto" };
  }
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: String(payload.tool_name) };
    const input = payload.tool_input as Record<string, unknown> | undefined;
    if (input?.command) {
      const cmd = String(input.command);
      info.detail = cmd.slice(0, 60) + (cmd.length > 60 ? "..." : "");
    } else if (input?.file_path) {
      info.detail = String(input.file_path).split("/").pop();
    } else if (input?.pattern) {
      info.detail = String(input.pattern);
    }
    return info;
  }
  return null;
}

export function EventCard({ event, isSelected, isNew, onSelect }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const color = EVENT_TYPE_COLORS[event.hook_event_type] || "#6b6b8d";
  const emoji = EVENT_TYPE_EMOJIS[event.hook_event_type] || "❓";
  const toolInfo = getToolInfo(event);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ""} ${isNew ? styles.newEvent : ""}`}
      style={{ borderLeftColor: color }}
      onClick={() => onSelect(event)}
    >
      <div className={styles.row}>
        <span className={styles.emoji}>{emoji}</span>
        <span className={styles.time}>{formatTime(event.timestamp || event.received_at)}</span>
        <span className={styles.badge} style={{ background: color }}>
          {event.hook_event_type}
        </span>
        {toolInfo && (
          <span className={styles.toolInfo}>
            <span className={styles.toolName} style={{ borderColor: `${color}66`, color }}>{toolInfo.tool}</span>
            {toolInfo.detail && <span className={styles.toolDetail}>{toolInfo.detail}</span>}
          </span>
        )}
        <span className={styles.session}>{event.session_id.slice(0, 8)}</span>
      </div>

      {event.summary && <div className={styles.summary}>📝 {event.summary}</div>}

      <button
        className={styles.expandBtn}
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? "▼" : "▶"}
      </button>

      {expanded && (
        <div className={styles.expandedContent}>
          <div className={styles.payloadHeader}>
            <span>📦 Payload</span>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
          <pre className={styles.payload}>{JSON.stringify(event.payload, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
