"use client";

import { useNow } from "@/hooks/useNow";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface StatusBarProps {
  mqttConnected: boolean;
  loading: boolean;
  error: string | null;
  deviceCount: number;
  onOpenDrawer: () => void;
  theme: string;
  onThemeChange: (id: string) => void;
}

export function StatusBar({ mqttConnected, loading, error, deviceCount, onOpenDrawer, theme, onThemeChange }: StatusBarProps) {
  const nowMs = useNow(10_000);
  const clock = new Date(nowMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="status-bar">
      {/* brand */}
      <div className="status-brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">PULSAR</span>
        <span className="brand-sub">tracker</span>
      </div>

      {/* centre pills */}
      <div className="status-pills">
        {/* MQTT indicator */}
        <div className={`pill ${mqttConnected ? "pill--live" : "pill--warn"}`}>
          <span className="pill-dot" />
          {mqttConnected ? "LIVE" : "RECONNECTING"}
        </div>

        {/* device count */}
        <div className="pill pill--neutral">
          {deviceCount} {deviceCount === 1 ? "DEVICE" : "DEVICES"}
        </div>

        {/* loading */}
        {loading && (
          <div className="pill pill--warn">
            <span className="spinner" /> LOADING
          </div>
        )}
      </div>

      {/* right: error or clock, plus theme + drawer toggles */}
      <div className="status-right">
        {error ? (
          <span className="status-error" title={error}>
            ✕ {error.length > 40 ? error.slice(0, 40) + "…" : error}
          </span>
        ) : (
          <span className="status-clock">{clock}</span>
        )}
        <ThemeSwitcher theme={theme} onChange={onThemeChange} />
        <button className="drawer-toggle" onClick={onOpenDrawer} aria-label="Open devices & data panel">
          ☰ DATA
        </button>
      </div>

      <style jsx>{`
        .status-bar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 14px;
          height: 40px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          font-family: "IBM Plex Mono", "Fira Code", monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          user-select: none;
        }

        .status-brand {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .brand-icon {
          color: var(--accent);
          font-size: 15px;
        }

        .brand-name {
          font-weight: 700;
          color: var(--text);
        }

        .brand-sub {
          color: var(--text-dim);
          font-weight: 400;
        }

        .status-pills {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
        }

        .pill--live {
          background: var(--success-bg);
          color: var(--success);
          border: 1px solid var(--success-border);
        }

        .pill--warn {
          background: var(--warning-bg);
          color: var(--warning);
          border: 1px solid var(--warning-border);
        }

        .pill--neutral {
          background: var(--bg-elevated);
          color: var(--text-muted);
          border: 1px solid var(--border);
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 5px currentColor;
          animation: pulse 2s ease-in-out infinite;
        }

        .pill--warn .pill-dot {
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .spinner {
          width: 8px;
          height: 8px;
          border: 1.5px solid var(--warning);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .drawer-toggle {
          background: var(--bg-elevated);
          border: 1px solid var(--border-strong);
          color: var(--text-muted);
          border-radius: 4px;
          padding: 4px 9px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
        }
        .drawer-toggle:hover { background: var(--bg-hover); color: var(--text); border-color: var(--accent-border); }

        .status-error {
          color: var(--danger);
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-clock {
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </header>
  );
}
