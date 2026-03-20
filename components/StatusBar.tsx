"use client";

import { useState, useEffect } from "react";

interface StatusBarProps {
  mqttConnected: boolean;
  loading: boolean;
  error: string | null;
  deviceCount: number;
}

export function StatusBar({ mqttConnected, loading, error, deviceCount }: StatusBarProps) {
  const [now, setNow] = useState("");

  useEffect(() => {
    function tick() {
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

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

      {/* right: error or clock */}
      <div className="status-right">
        {error ? (
          <span className="status-error" title={error}>
            ✕ {error.length > 40 ? error.slice(0, 40) + "…" : error}
          </span>
        ) : (
          <span className="status-clock">{now}</span>
        )}
      </div>

      <style jsx>{`
        .status-bar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 14px;
          height: 40px;
          background: #0d1117;
          border-bottom: 1px solid #21262d;
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
          color: #58a6ff;
          font-size: 15px;
        }

        .brand-name {
          font-weight: 700;
          color: #c9d1d9;
        }

        .brand-sub {
          color: #484f58;
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
          background: #0d2318;
          color: #3fb950;
          border: 1px solid #1a4d2e;
        }

        .pill--warn {
          background: #2d2010;
          color: #d29922;
          border: 1px solid #4d3a10;
        }

        .pill--neutral {
          background: #161b22;
          color: #8b949e;
          border: 1px solid #21262d;
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
          border: 1.5px solid #d29922;
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
          justify-content: flex-end;
        }

        .status-error {
          color: #f85149;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-clock {
          color: #484f58;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </header>
  );
}
