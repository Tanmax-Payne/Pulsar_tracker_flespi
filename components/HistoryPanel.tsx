"use client";

import { useState, useCallback, useRef } from "react";
import { getMessageRange, Message } from "@/lib/flespiApi";

interface HistoryPanelProps {
  token: string;
  deviceId: number;
  onTrack: (points: Array<[number, number]>) => void; // [lat, lng][]
  onClose: () => void;
}

type Status = "idle" | "loading" | "done" | "error";

export function HistoryPanel({ token, deviceId, onTrack, onClose }: HistoryPanelProps) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 1);
    return toLocalIsoString(d).slice(0, 16);
  });
  const [toDate, setToDate] = useState(() => toLocalIsoString(new Date()).slice(0, 16));
  const [status, setStatus] = useState<Status>("idle");
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState("");
  const abortRef = useRef(false);

  const handleFetch = useCallback(async () => {
    if (!fromDate || !toDate) return;
    const fromTs = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTs = Math.floor(new Date(toDate).getTime() / 1000);
    if (fromTs >= toTs) { setError("'From' must be before 'To'"); return; }
    if (toTs - fromTs > 86400 * 7) { setError("Max range: 7 days"); return; }

    setStatus("loading");
    setError("");
    abortRef.current = false;

    try {
      const msgs: Message[] = await getMessageRange(token, deviceId, fromTs, toTs, 500);
      if (abortRef.current) return;

      const points: Array<[number, number]> = msgs
        .filter((m) => m["position.latitude"] != null && m["position.longitude"] != null)
        .map((m) => [m["position.latitude"] as number, m["position.longitude"] as number]);

      setPointCount(points.length);
      onTrack(points);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }, [token, deviceId, fromDate, toDate, onTrack]);

  return (
    <div className="history-panel">
      <div className="history-header">
        <span className="history-title">⏱ HISTORY</span>
        <button className="history-close" onClick={onClose} aria-label="Close history">×</button>
      </div>

      <div className="history-row">
        <label className="history-label">From</label>
        <input
          type="datetime-local"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="history-input"
          max={toDate}
        />
      </div>

      <div className="history-row">
        <label className="history-label">To</label>
        <input
          type="datetime-local"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="history-input"
          min={fromDate}
        />
      </div>

      <button
        className="history-btn"
        onClick={handleFetch}
        disabled={status === "loading"}
      >
        {status === "loading" ? "⟳ Fetching…" : "Load Track"}
      </button>

      {status === "done" && (
        <div className="history-result">
          ✓ {pointCount} position{pointCount !== 1 ? "s" : ""} plotted
        </div>
      )}

      {(status === "error" || error) && (
        <div className="history-error">{error}</div>
      )}

      <style jsx>{`
        .history-panel {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 10px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .history-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #58a6ff;
        }

        .history-close {
          background: none;
          border: none;
          color: #8b949e;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .history-close:hover { color: #c9d1d9; }

        .history-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .history-label {
          font-size: 9px;
          color: #8b949e;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .history-input {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 4px;
          color: #c9d1d9;
          font-family: inherit;
          font-size: 10px;
          padding: 4px 6px;
          width: 100%;
          box-sizing: border-box;
          color-scheme: dark;
        }

        .history-input:focus {
          outline: none;
          border-color: #58a6ff;
        }

        .history-btn {
          background: #1c2128;
          border: 1px solid #388bfd;
          border-radius: 4px;
          color: #58a6ff;
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          padding: 5px;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 2px;
        }

        .history-btn:hover:not(:disabled) { background: #132235; }
        .history-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .history-result {
          font-size: 10px;
          color: #3fb950;
          text-align: center;
          padding: 3px 0;
        }

        .history-error {
          font-size: 10px;
          color: #f85149;
          padding: 3px 0;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function toLocalIsoString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
