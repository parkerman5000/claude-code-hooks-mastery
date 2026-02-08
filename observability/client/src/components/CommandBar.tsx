import { useState } from "react";
import styles from "./CommandBar.module.css";

interface CommandBarProps {
  onAgentCreated?: () => void;
}

export function CommandBar({ onAgentCreated }: CommandBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeploy = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `agent-${Date.now().toString(36)}`,
          prompt: prompt.trim(),
          allowedTools: ["Read", "Glob", "Grep", "Bash"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create agent");
      } else {
        setPrompt("");
        onAgentCreated?.();
      }
    } catch {
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateAll = async () => {
    try {
      await fetch("http://localhost:4000/agents", { method: "DELETE" });
    } catch {
      setError("Failed to terminate agents");
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="Describe what you need an agent to do..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDeploy()}
          disabled={loading}
        />
        <button
          className={styles.deployBtn}
          onClick={handleDeploy}
          disabled={!prompt.trim() || loading}
        >
          {loading ? "Deploying..." : "Deploy Agent"}
        </button>
        <button className={styles.terminateBtn} onClick={handleTerminateAll}>
          Terminate All
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
