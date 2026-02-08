import { useMemo } from "react";
import type { HookEvent } from "../types";
import { EVENT_TYPE_COLORS } from "../types";
import styles from "./Header.module.css";

interface HeaderProps {
  isConnected: boolean;
  events: HookEvent[];
  onClear: () => void;
}

export function Header({ isConnected, events, onClear }: HeaderProps) {
  const sessionCount = useMemo(() => new Set(events.map((e) => e.session_id)).size, [events]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.hook_event_type] = (counts[e.hook_event_type] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [events]);

  const toolCallCount = useMemo(
    () => events.filter((e) => e.hook_event_type === "PreToolUse").length,
    [events]
  );

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.logo}>CC</span>
          <div className={styles.titleGroup}>
            <span className={styles.title}>OBSERVABILITY</span>
            <span className={styles.subtitle}>PROJECT BUTCH — LIVE</span>
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.connStatus}>
            <span className={isConnected ? styles.dotLive : styles.dotDead} />
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
          <button className={styles.clearBtn} onClick={onClear}>Clear</button>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statEmoji}>⚡</span>
          <span className={styles.statValue}>{events.length}</span>
          <span className={styles.statLabel}>events</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statEmoji}>🔧</span>
          <span className={styles.statValue}>{toolCallCount}</span>
          <span className={styles.statLabel}>tool calls</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statEmoji}>👥</span>
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statLabel}>sessions</span>
        </div>
        <div className={styles.typePills}>
          {typeCounts.map(([type, count]) => (
            <span
              key={type}
              className={styles.pill}
              style={{ borderColor: EVENT_TYPE_COLORS[type] || "#6b6b8d", color: EVENT_TYPE_COLORS[type] || "#6b6b8d" }}
            >
              {type} <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
