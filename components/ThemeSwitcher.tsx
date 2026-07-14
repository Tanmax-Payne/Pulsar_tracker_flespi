"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { THEMES } from "@/lib/themes";

interface ThemeSwitcherProps {
  theme: string;
  onChange: (id: string) => void;
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const active = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <div className="wrap">
      <button className="trigger" onClick={() => setOpen(o => !o)} aria-label="Change theme">
        <Palette size={12} strokeWidth={2.25} />
        {active.name.toUpperCase()}
      </button>

      {open && (
        <>
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="menu">
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`item ${t.id === theme ? "item--active" : ""}`}
                onClick={() => { onChange(t.id); setOpen(false); }}
              >
                <span className="swatch" data-theme={t.id}>
                  <span className="dot" />
                </span>
                <span className="labels">
                  <span className="name">{t.name}</span>
                  <span className="tagline">{t.tagline}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .wrap { position: relative; }

        .trigger {
          display: flex; align-items: center; gap: 6px;
          background: var(--bg-elevated); border: 1px solid var(--border-strong);
          color: var(--text-muted); border-radius: 4px; padding: 4px 9px;
          font-family: "IBM Plex Mono", monospace; font-size: 10px; font-weight: 700;
          letter-spacing: 0.05em; cursor: pointer;
        }
        .trigger:hover { background: var(--bg-hover); color: var(--text); border-color: var(--accent-border); }

        .backdrop { position: fixed; inset: 0; z-index: 1999; }

        .menu {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 2000;
          background: var(--bg-elevated); border: 1px solid var(--border-strong);
          border-radius: 8px; overflow: hidden; min-width: 210px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          background: none; border: none; border-bottom: 1px solid var(--border);
          padding: 8px 10px; cursor: pointer; text-align: left;
        }
        .item:last-child { border-bottom: none; }
        .item:hover { background: var(--bg-hover); }
        .item--active { background: var(--accent-bg); }

        .swatch {
          width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0;
          background: var(--bg); border: 1px solid var(--border-strong);
          display: flex; align-items: center; justify-content: center;
        }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }

        .labels { display: flex; flex-direction: column; gap: 1px; }
        .name    { font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 700; color: var(--text); }
        .tagline { font-family: "IBM Plex Mono", monospace; font-size: 9px;  color: var(--text-muted); }
      `}</style>
    </div>
  );
}
