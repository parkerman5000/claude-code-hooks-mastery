import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { HookEvent } from "../types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS } from "../types";
import styles from "./LivePulse.module.css";

interface LivePulseProps {
  events: HookEvent[];
}

type TimeRange = "1m" | "3m" | "5m";

interface DataPoint {
  count: number;
  eventTypes: Record<string, number>;
  timestamp: number;
}

const TIME_RANGES: TimeRange[] = ["1m", "3m", "5m"];
const BUCKET_COUNT = 60;

function getBucketDuration(range: TimeRange): number {
  switch (range) {
    case "1m": return 1000;       // 1s per bucket
    case "3m": return 3000;       // 3s per bucket
    case "5m": return 5000;       // 5s per bucket
  }
}

function getTimeLabels(range: TimeRange): string[] {
  switch (range) {
    case "1m": return ["60s", "45s", "30s", "15s", "now"];
    case "3m": return ["3m", "2m", "1m", "now"];
    case "5m": return ["5m", "4m", "3m", "2m", "1m", "now"];
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDominantType(types: Record<string, number>): string | null {
  let max = 0;
  let dom: string | null = null;
  for (const [t, c] of Object.entries(types)) {
    if (c > max) { max = c; dom = t; }
  }
  return dom;
}

export function LivePulse({ events }: LivePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const pulseEffects = useRef<Array<{ x: number; y: number; radius: number; opacity: number; color: string }>>([]);
  const prevEventCount = useRef(0);

  const bucketMs = getBucketDuration(timeRange);
  const windowMs = bucketMs * BUCKET_COUNT;

  // Compute data points from events
  const dataPoints = useMemo((): DataPoint[] => {
    const now = Date.now();
    const start = now - windowMs;
    const buckets: DataPoint[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      count: 0,
      eventTypes: {},
      timestamp: start + i * bucketMs,
    }));

    for (const event of events) {
      const ts = event.timestamp || event.received_at;
      if (ts < start || ts > now) continue;
      const idx = Math.min(Math.floor((ts - start) / bucketMs), BUCKET_COUNT - 1);
      buckets[idx].count++;
      const t = event.hook_event_type;
      buckets[idx].eventTypes[t] = (buckets[idx].eventTypes[t] || 0) + 1;
    }
    return buckets;
  }, [events, timeRange, windowMs, bucketMs]);

  // Track new events for pulse effects
  useEffect(() => {
    if (events.length > prevEventCount.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const newCount = events.length - prevEventCount.current;
      for (let i = 0; i < Math.min(newCount, 3); i++) {
        const evt = events[events.length - 1 - i];
        const color = EVENT_TYPE_COLORS[evt.hook_event_type] || "#8b5cf6";
        pulseEffects.current.push({
          x: w - 20 - i * 15,
          y: h / 2,
          radius: 0,
          opacity: 0.8,
          color,
        });
      }
    }
    prevEventCount.current = events.length;
  }, [events.length]);

  const totalEvents = useMemo(() => dataPoints.reduce((s, d) => s + d.count, 0), [dataPoints]);
  const toolCalls = useMemo(() =>
    dataPoints.reduce((s, d) => s + (d.eventTypes["PreToolUse"] || 0), 0), [dataPoints]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.offsetWidth;
    const h = 110;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const pad = { top: 8, right: 10, bottom: 22, left: 10 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const maxVal = Math.max(...dataPoints.map((d) => d.count), 1);
    const barTotal = chartW / BUCKET_COUNT;
    const barW = Math.max(barTotal * 0.7, 2);
    const gap = (barTotal - barW) / 2;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "rgba(17,17,34,0.6)");
    bgGrad.addColorStop(1, "rgba(10,10,18,0.8)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(30,30,58,0.4)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const gy = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + chartW, gy);
      ctx.stroke();
    }

    // X-axis
    ctx.strokeStyle = "rgba(30,30,58,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH);
    ctx.lineTo(pad.left + chartW, pad.top + chartH);
    ctx.stroke();

    // Bars
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const dp = dataPoints[i];
      if (dp.count === 0) continue;

      const x = pad.left + i * barTotal + gap;
      const barH = (dp.count / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      const domType = getDominantType(dp.eventTypes);
      const color = domType ? (EVENT_TYPE_COLORS[domType] || "#8b5cf6") : "#8b5cf6";

      // Glow
      const glowR = 8 + (dp.count / maxVal) * 16;
      const cx = x + barW / 2;
      const cy = y + barH / 2;
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glowGrad.addColorStop(0, hexToRgba(color, 0.25 * (dp.count / maxVal)));
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      // Bar with rounded top
      const barGrad = ctx.createLinearGradient(x, y, x, y + barH);
      barGrad.addColorStop(0, hexToRgba(color, 0.95));
      barGrad.addColorStop(0.5, color);
      barGrad.addColorStop(1, hexToRgba(color, 0.7));

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      const r = Math.min(2, barW / 2);
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.lineTo(x + barW - r, y);
      ctx.arcTo(x + barW, y, x + barW, y + r, r);
      ctx.lineTo(x + barW, y + barH);
      ctx.closePath();
      ctx.fill();

      // Emoji on tall bars
      if (barH > 28 && barTotal > 10 && domType) {
        const emoji = EVENT_TYPE_EMOJIS[domType];
        if (emoji) {
          ctx.save();
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff";
          ctx.fillText(emoji, cx, y + barH / 2);
          ctx.restore();
        }
      }
    }

    // Pulse effects
    const remaining: typeof pulseEffects.current = [];
    for (const p of pulseEffects.current) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, hexToRgba(p.color, p.opacity));
      grad.addColorStop(0.5, hexToRgba(p.color, p.opacity * 0.4));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      p.radius += 2.5;
      p.opacity -= 0.025;
      if (p.opacity > 0) remaining.push(p);
    }
    pulseEffects.current = remaining;

    // Time labels
    const labels = getTimeLabels(timeRange);
    ctx.fillStyle = "#3a3a5a";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const labelY = pad.top + chartH + 6;
    for (let i = 0; i < labels.length; i++) {
      const lx = pad.left + (i / (labels.length - 1)) * chartW;
      ctx.fillText(labels[i], lx, labelY);
    }
  }, [dataPoints, timeRange]);

  // Animation loop at 30fps
  useEffect(() => {
    let running = true;
    let lastFrame = 0;
    const interval = 1000 / 30;

    const loop = (ts: number) => {
      if (!running) return;
      if (ts - lastFrame >= interval) {
        render();
        lastFrame = ts - ((ts - lastFrame) % interval);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { running = false; };
  }, [render]);

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.label}>
          <span className={styles.labelIcon}>📊</span>
          <span className={styles.labelText}>Live Activity Pulse</span>
        </div>
        <div className={styles.statsGroup}>
          <span className={styles.stat}>⚡ <strong>{totalEvents}</strong> events</span>
          <span className={styles.stat}>🔧 <strong>{toolCalls}</strong> tools</span>
        </div>
        <div className={styles.ranges}>
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              className={`${styles.rangeBtn} ${timeRange === r ? styles.rangeBtnActive : ""}`}
              onClick={() => setTimeRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={styles.chartWrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}
