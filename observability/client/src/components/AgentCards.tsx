import type { Agent } from "../types";
import { AGENT_STATE_COLORS } from "../types";
import styles from "./AgentCards.module.css";

interface AgentCardsProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export function AgentCards({ agents, selectedAgent, onSelectAgent }: AgentCardsProps) {
  if (agents.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🤖</div>
        <div className={styles.emptyText}>No agents running</div>
        <div className={styles.emptyHint}>Use the command bar above to deploy one</div>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {agents.map((agent) => {
        const stateColor = AGENT_STATE_COLORS[agent.state] || "#6b6b8d";
        const isSelected = selectedAgent?.id === agent.id;
        return (
          <div
            key={agent.id}
            className={`${styles.card} ${isSelected ? styles.selected : ""}`}
            style={{ borderColor: isSelected ? stateColor : undefined }}
            onClick={() => onSelectAgent(agent)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.name}>{agent.name}</span>
              <span
                className={`${styles.badge} ${agent.state === "working" ? styles.badgePulse : ""}`}
                style={{ background: stateColor }}
              >
                {agent.state}
              </span>
            </div>
            <div className={styles.model}>{agent.model}</div>
            <div className={styles.prompt}>{agent.prompt}</div>
            <div className={styles.cardStats}>
              <span>🔧 {agent.toolCalls}</span>
              <span>💬 {agent.messages.length}</span>
            </div>
            <div className={styles.contextBar}>
              <div
                className={styles.contextFill}
                style={{ width: `${agent.contextUsage}%`, background: stateColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
