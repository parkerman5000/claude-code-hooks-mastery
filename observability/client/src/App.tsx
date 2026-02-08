import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import type { HookEvent } from "./types";
import { Header } from "./components/Header";
import { LivePulse } from "./components/LivePulse";
import { FilterBar } from "./components/FilterBar";
import { EventFeed } from "./components/EventFeed";
import { EventDetail } from "./components/EventDetail";
import styles from "./App.module.css";

export function App() {
  const { events, isConnected, clearEvents } = useWebSocket("ws://localhost:4000/ws");
  const [selectedEvent, setSelectedEvent] = useState<HookEvent | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [newEventIds, setNewEventIds] = useState(new Set<number>());

  // Track new events for slide-in animation
  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      const newIds = new Set<number>();
      for (let i = prevEventCountRef.current; i < events.length; i++) {
        newIds.add(events[i].id);
      }
      setNewEventIds(newIds);

      // Clear "new" flag after animation
      const timer = setTimeout(() => {
        setNewEventIds(new Set<number>());
      }, 500);
      prevEventCountRef.current = events.length;
      return () => clearTimeout(timer);
    }
    prevEventCountRef.current = events.length;
  }, [events.length]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterType && e.hook_event_type !== filterType) return false;
      if (filterSession && e.session_id !== filterSession) return false;
      return true;
    });
  }, [events, filterType, filterSession]);

  const handleClear = useCallback(() => {
    clearEvents();
    setSelectedEvent(null);
  }, [clearEvents]);

  return (
    <div className={styles.app}>
      <Header
        isConnected={isConnected}
        events={events}
        onClear={handleClear}
      />
      <LivePulse events={events} />
      <FilterBar
        events={events}
        filterType={filterType}
        filterSession={filterSession}
        onFilterTypeChange={setFilterType}
        onFilterSessionChange={setFilterSession}
      />
      <div className={styles.content}>
        <EventFeed
          events={filteredEvents}
          selectedEvent={selectedEvent}
          newEventIds={newEventIds}
          onSelectEvent={setSelectedEvent}
        />
        <EventDetail event={selectedEvent} />
      </div>
    </div>
  );
}
