"use client";

import { POLL_INTERVALS } from "@/lib/pollInterval";

interface PollIntervalPickerProps {
  pollMs: number;
  onChange: (ms: number) => void;
}

export function PollIntervalPicker({ pollMs, onChange }: PollIntervalPickerProps) {
  return (
    <div className="picker">
      <p className="hint">How often to poll Flespi for updates (MQTT live updates aren&apos;t affected — this only governs the REST safety-net poll).</p>
      <div className="chips">
        {POLL_INTERVALS.map(o => (
          <button
            key={o.ms}
            className={`chip ${pollMs === o.ms ? "chip--active" : ""}`}
            onClick={() => onChange(o.ms)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        .picker { display: flex; flex-direction: column; gap: 8px; }

        .hint {
          margin: 0;
          font-size: 9px;
          line-height: 1.5;
          color: var(--text-dim);
        }

        .chips { display: flex; gap: 4px; }

        .chip {
          flex: 1;
          background: var(--bg-elevated);
          border: 1px solid var(--border-strong);
          color: var(--text-muted);
          border-radius: 4px;
          padding: 6px 0;
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .chip:hover { border-color: var(--accent-border); color: var(--text); }
        .chip--active { background: var(--bg-selected); border-color: var(--accent); color: var(--accent); }
      `}</style>
    </div>
  );
}
