import { useRef, useEffect } from "react";
import type { HookEvent } from "../types";
import { EventCard } from "./EventCard";
import styles from "./EventFeed.module.css";

interface EventFeedProps {
  events: HookEvent[];
  selectedEvent: HookEvent | null;
  newEventIds: Set<number>;
  onSelectEvent: (event: HookEvent) => void;
}

export function EventFeed({ events, selectedEvent, newEventIds, onSelectEvent }: EventFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(events.length);

  useEffect(() => {
    if (events.length > prevCountRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  const reversed = [...events].reverse();

  return (
    <div className={styles.feed} ref={containerRef}>
      {reversed.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyEmoji}>⏳</span>
          <span>Waiting for events...</span>
        </div>
      ) : (
        reversed.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            isNew={newEventIds.has(event.id)}
            onSelect={onSelectEvent}
          />
        ))
      )}
    </div>
  );
}
