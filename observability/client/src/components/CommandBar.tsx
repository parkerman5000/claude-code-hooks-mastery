import { useState } from "react";
import styles from "./CommandBar.module.css";

interface CommandBarProps {
  onAgentCreated?: () => void;
}

const WORKING_DIR_PRESETS = [
  { label: "Server CWD (default)", value: "" },
  { label: "FPC Construction", value: "/home/maestro/FPC_Construction_2" },
  { label: "mpowerio Operations", value: "/home/maestro/projects/mpowerio-operations" },
  { label: "Hooks Mastery", value: "/home/maestro/indydevdan/claude-code-hooks-mastery" },
];

const MODEL_PRESETS = [
  { label: "Sonnet 4.5", value: "claude-sonnet-4-5-20250929" },
  { label: "Opus 4.6", value: "claude-opus-4-6" },
];

const TOOL_PRESETS = [
  { label: "Read-only", value: ["Read", "Glob", "Grep", "Bash"] },
  { label: "Full Edit", value: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"] },
  { label: "Explore Only", value: ["Read", "Glob", "Grep"] },
];

export function CommandBar({ onAgentCreated }: CommandBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workingDir, setWorkingDir] = useState("");
  const [model, setModel] = useState(MODEL_PRESETS[0].value);
  const [toolPresetIdx, setToolPresetIdx] = useState(0);

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
          model,
          allowedTools: TOOL_PRESETS[toolPresetIdx].value,
          workingDir: workingDir || undefined,
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
      <div className={styles.optionsRow}>
        <select
          className={styles.select}
          value={workingDir}
          onChange={(e) => setWorkingDir(e.target.value)}
        >
          {WORKING_DIR_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          className={styles.select}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {MODEL_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          className={styles.select}
          value={toolPresetIdx}
          onChange={(e) => setToolPresetIdx(Number(e.target.value))}
        >
          {TOOL_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
      </div>
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
