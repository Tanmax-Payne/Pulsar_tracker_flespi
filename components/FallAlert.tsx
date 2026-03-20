"use client";

import { useEffect, useState } from "react";

interface FallAlertProps {
  deviceName: string;
  ts: number | null;
  onDismiss: () => void;
}

export function FallAlert({ deviceName, ts, onDismiss }: FallAlertProps) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 250); // wait for fade-out
  }

  return (
    <div className={`alert ${visible ? "alert--visible" : ""}`} role="alert" aria-live="assertive">
      {/* icon */}
      <div className="alert-icon">⚠</div>

      {/* text */}
      <div className="alert-body">
        <div className="alert-title">FALL DETECTED</div>
        <div className="alert-device">{deviceName}</div>
        {ts && (
          <div className="alert-time">{new Date(ts * 1000).toLocaleString()}</div>
        )}
      </div>

      {/* dismiss */}
      <button
        className="alert-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss fall alert"
      >
        ×
      </button>

      <style jsx>{`
        .alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #1a0a0a;
          border: 1px solid #7a1f1c;
          border-radius: 6px;
          padding: 9px 10px;
          font-family: "IBM Plex Mono", monospace;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.25s, transform 0.25s;
        }

        .alert--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .alert-icon {
          font-size: 16px;
          color: #f85149;
          line-height: 1;
          flex-shrink: 0;
          animation: icon-flash 1s steps(1) infinite;
        }

        @keyframes icon-flash {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }

        .alert-body {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          font-size: 10px;
          font-weight: 700;
          color: #f85149;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
        }

        .alert-device {
          font-size: 12px;
          color: #c9d1d9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alert-time {
          font-size: 9px;
          color: #8b949e;
          margin-top: 2px;
        }

        .alert-dismiss {
          background: none;
          border: none;
          color: #8b949e;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0 2px;
          flex-shrink: 0;
          transition: color 0.15s;
        }

        .alert-dismiss:hover { color: #f85149; }
      `}</style>
    </div>
  );
}
