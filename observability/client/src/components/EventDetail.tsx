import type { HookEvent } from "../types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS } from "../types";
import styles from "./EventDetail.module.css";

interface EventDetailProps {
  event: HookEvent | null;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return "N/A";
  return new Date(ts).toLocaleString();
}

export function EventDetail({ event }: EventDetailProps) {
  if (!event) {
    return (
      <div className={styles.panel}>
        <div className={styles.placeholder}>
          <span className={styles.placeholderEmoji}>🔍</span>
          <span>Select an event to inspect</span>
        </div>
      </div>
    );
  }

  const color = EVENT_TYPE_COLORS[event.hook_event_type] || "#6b6b8d";
  const emoji = EVENT_TYPE_EMOJIS[event.hook_event_type] || "❓";

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerEmoji}>{emoji}</span>
        <span className={styles.badge} style={{ background: color }}>
          {event.hook_event_type}
        </span>
        <span className={styles.id}>#{event.id}</span>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.label}>Session</span>
          <span className={styles.value}>{event.session_id}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>Source</span>
          <span className={styles.value}>{event.source_app}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>Timestamp</span>
          <span className={styles.value}>{formatTimestamp(event.timestamp || event.received_at)}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>Received</span>
          <span className={styles.value}>{formatTimestamp(event.received_at)}</span>
        </div>
      </div>

      {event.summary && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>📝 Summary</div>
          <div className={styles.summaryText}>{event.summary}</div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>📦 Payload</div>
        <pre className={styles.json}>{JSON.stringify(event.payload, null, 2)}</pre>
      </div>

      {event.chat && event.chat.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>💬 Chat Transcript ({event.chat.length} messages)</div>
          <pre className={styles.json}>{JSON.stringify(event.chat, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
