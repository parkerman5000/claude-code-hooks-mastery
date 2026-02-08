import type { Agent } from "../types";
import { AGENT_STATE_COLORS } from "../types";
import { AgentLog } from "./AgentLog";
import styles from "./AgentDetail.module.css";

interface AgentDetailProps {
  agent: Agent | null;
  onClose: () => void;
}

export function AgentDetail({ agent, onClose }: AgentDetailProps) {
  if (!agent) {
    return (
      <aside className={styles.panel}>
        <div className={styles.placeholder}>Select an agent to view details</div>
      </aside>
    );
  }

  const stateColor = AGENT_STATE_COLORS[agent.state] || "#6b6b8d";

  const handleTerminate = async () => {
    try {
      await fetch(`http://localhost:4000/agents/${agent.id}`, { method: "DELETE" });
    } catch {
      // Termination event will arrive via WebSocket
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.name}>{agent.name}</span>
          <span className={styles.badge} style={{ background: stateColor }}>
            {agent.state}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Model</span>
          <span className={styles.metaValue}>{agent.model}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Created</span>
          <span className={styles.metaValue}>
            {new Date(agent.createdAt).toLocaleTimeString()}
          </span>
        </div>
        {agent.completedAt && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Completed</span>
            <span className={styles.metaValue}>
              {new Date(agent.completedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Tools</span>
          <span className={styles.metaValue}>{agent.allowedTools.join(", ")}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Tool Calls</span>
          <span className={styles.metaValue}>{agent.toolCalls}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Tokens</span>
          <span className={styles.metaValue}>
            {agent.cost.input.toLocaleString()} in / {agent.cost.output.toLocaleString()} out
          </span>
        </div>
      </div>

      <div className={styles.promptSection}>
        <span className={styles.sectionTitle}>Prompt</span>
        <div className={styles.promptText}>{agent.prompt}</div>
      </div>

      {agent.error && (
        <div className={styles.errorBox}>{agent.error}</div>
      )}

      <div className={styles.contextSection}>
        <span className={styles.sectionTitle}>Context ({agent.contextUsage}%)</span>
        <div className={styles.contextBar}>
          <div
            className={styles.contextFill}
            style={{ width: `${agent.contextUsage}%`, background: stateColor }}
          />
        </div>
      </div>

      <div className={styles.logSection}>
        <span className={styles.sectionTitle}>Live Log</span>
        <AgentLog messages={agent.messages} />
      </div>

      {(agent.state === "working" || agent.state === "idle") && (
        <div className={styles.actions}>
          <button className={styles.terminateBtn} onClick={handleTerminate}>
            Terminate Agent
          </button>
        </div>
      )}
    </aside>
  );
}
