import { useMemo } from "react";
import type { Agent } from "../types";
import styles from "./CostSummary.module.css";

interface CostSummaryProps {
  agents: Agent[];
}

export function CostSummary({ agents }: CostSummaryProps) {
  const stats = useMemo(() => {
    const active = agents.filter((a) => a.state === "working" || a.state === "idle").length;
    const totalCost = agents.reduce((s, a) => s + a.cost.total, 0);
    const totalTools = agents.reduce((s, a) => s + a.toolCalls, 0);
    return { total: agents.length, active, totalCost, totalTools };
  }, [agents]);

  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <span className={styles.value}>{stats.total}</span>
        <span className={styles.label}>Total Agents</span>
      </div>
      <div className={styles.stat}>
        <span className={`${styles.value} ${stats.active > 0 ? styles.active : ""}`}>
          {stats.active}
        </span>
        <span className={styles.label}>Active</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{stats.totalTools}</span>
        <span className={styles.label}>Tool Calls</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{stats.totalCost.toLocaleString()}</span>
        <span className={styles.label}>Tokens Used</span>
      </div>
    </div>
  );
}
