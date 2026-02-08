import { useMemo } from "react";
import type { HookEvent } from "../types";
import { EVENT_TYPE_EMOJIS } from "../types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  events: HookEvent[];
  filterType: string;
  filterSession: string;
  onFilterTypeChange: (type: string) => void;
  onFilterSessionChange: (session: string) => void;
}

export function FilterBar({
  events,
  filterType,
  filterSession,
  onFilterTypeChange,
  onFilterSessionChange,
}: FilterBarProps) {
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.hook_event_type));
    return Array.from(types).sort();
  }, [events]);

  const sessions = useMemo(() => {
    const ids = new Set(events.map((e) => e.session_id));
    return Array.from(ids).sort();
  }, [events]);

  return (
    <div className={styles.bar}>
      <select
        className={styles.select}
        value={filterType}
        onChange={(e) => onFilterTypeChange(e.target.value)}
      >
        <option value="">All Event Types</option>
        {eventTypes.map((t) => (
          <option key={t} value={t}>
            {EVENT_TYPE_EMOJIS[t] || ""} {t}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={filterSession}
        onChange={(e) => onFilterSessionChange(e.target.value)}
      >
        <option value="">All Sessions</option>
        {sessions.map((s) => (
          <option key={s} value={s}>
            {s.slice(0, 8)}...
          </option>
        ))}
      </select>
    </div>
  );
}
