"use client";

import { useCallback, useEffect, useState } from "react";
import { getMessageRange, Message } from "@/lib/flespiApi";

interface HistoryPanelProps {
  deviceId: number;
  onTrack: (points: Array<[number, number]>) => void;
  onClose: () => void;
}

type Status = "idle" | "loading" | "done" | "error";

// Safety valve, not a product restriction — see getMessageRange's own
// comment. Any range is allowed; this just caps how many points we'll
// ever try to render in one track.
const MAX_POINTS = 20_000;

const PRESETS = [
  { label: "10m", ms: 10 * 60_000 },
  { label: "1h",  ms: 60 * 60_000 },
  { label: "12h", ms: 12 * 60 * 60_000 },
  { label: "24h", ms: 24 * 60 * 60_000 },
  { label: "7d",  ms: 7 * 24 * 60 * 60_000 },
  { label: "30d", ms: 30 * 24 * 60 * 60_000 },
] as const;

const DEFAULT_PRESET = 1; // "1h"

function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatRange(fromMs: number, toMs: number): string {
  const from = new Date(fromMs);
  const to   = new Date(toMs);
  const sameDay = from.toDateString() === to.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  if (sameDay) {
    return `${from.toLocaleDateString([], dateFmt)}, ${from.toLocaleTimeString([], timeFmt)} – ${to.toLocaleTimeString([], timeFmt)}`;
  }
  return `${from.toLocaleDateString([], dateFmt)} ${from.toLocaleTimeString([], timeFmt)} – ${to.toLocaleDateString([], dateFmt)} ${to.toLocaleTimeString([], timeFmt)}`;
}

export function HistoryPanel({ deviceId, onTrack, onClose }: HistoryPanelProps) {
  const [presetIdx, setPresetIdx] = useState<number>(DEFAULT_PRESET);
  const [customOpen, setCustomOpen] = useState(false);
  const [range, setRange] = useState(() => {
    const to = Date.now();
    return { from: to - PRESETS[DEFAULT_PRESET].ms, to };
  });

  const [customFrom, setCustomFrom] = useState(() => toLocalIso(new Date(Date.now() - PRESETS[DEFAULT_PRESET].ms)));
  const [customTo,   setCustomTo  ] = useState(() => toLocalIso(new Date()));

  const [status,    setStatus   ] = useState<Status>("idle");
  const [count,     setCount    ] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [err,       setErr      ] = useState("");

  const load = useCallback(async (fromMs: number, toMs: number) => {
    const fromTs = Math.floor(fromMs / 1000);
    const toTs   = Math.floor(toMs   / 1000);
    if (fromTs >= toTs) { setErr("'From' must be before 'To'"); setStatus("error"); return; }

    setStatus("loading"); setErr("");
    try {
      const msgs: Message[] = await getMessageRange(deviceId, fromTs, toTs, MAX_POINTS);
      const pts = msgs
        .filter(m => m["position.latitude"] != null && m["position.longitude"] != null)
        .map(m => [m["position.latitude"]!, m["position.longitude"]!] as [number, number]);
      setCount(pts.length);
      setTruncated(msgs.length >= MAX_POINTS);
      onTrack(pts);
      setStatus("done");
    } catch (e) {
      setErr((e as Error).message);
      setStatus("error");
    }
  }, [deviceId, onTrack]);

  // Load the default preset as soon as the panel opens (or the selected
  // device changes) — no manual step needed for the common case.
  useEffect(() => {
    load(range.from, range.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const selectPreset = useCallback((idx: number) => {
    const to = Date.now();
    const from = to - PRESETS[idx].ms;
    setPresetIdx(idx);
    setCustomOpen(false);
    setRange({ from, to });
    load(from, to);
  }, [load]);

  const applyCustom = useCallback(() => {
    const from = new Date(customFrom).getTime();
    const to   = new Date(customTo).getTime();
    setPresetIdx(-1);
    setRange({ from, to });
    load(from, to);
  }, [customFrom, customTo, load]);

  return (
    <div className="panel">
      <div className="row-hdr">
        <span className="title">⏱ HISTORY</span>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <p className="range-label">{formatRange(range.from, range.to)}</p>

      <div className="presets">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            className={`chip ${presetIdx === i ? "chip--active" : ""}`}
            onClick={() => selectPreset(i)}
            disabled={status === "loading"}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button className="custom-toggle" onClick={() => setCustomOpen(o => !o)}>
        {customOpen ? "▾" : "▸"} Custom range
      </button>

      {customOpen && (
        <div className="custom">
          {(["From", "To"] as const).map(label => (
            <div key={label} className="field">
              <span className="label">{label.toUpperCase()}</span>
              <input
                type="datetime-local"
                className="input"
                value={label === "From" ? customFrom : customTo}
                onChange={e => label === "From" ? setCustomFrom(e.target.value) : setCustomTo(e.target.value)}
              />
            </div>
          ))}
          <button className="btn" onClick={applyCustom} disabled={status === "loading"}>
            {status === "loading" ? "⟳ Fetching…" : "Load custom range"}
          </button>
        </div>
      )}

      {status === "loading" && <p className="hint">⟳ Fetching…</p>}
      {status === "done" && (
        <p className="ok">
          ✓ {count} point{count !== 1 ? "s" : ""} plotted
          {truncated && " (capped — narrow the range for the rest)"}
        </p>
      )}
      {(err || status === "error") && <p className="bad">{err}</p>}

      <style jsx>{`
        .panel { background:#161b22; border:1px solid #30363d; border-radius:6px; padding:10px; font-family:"IBM Plex Mono",monospace; font-size:11px; display:flex; flex-direction:column; gap:6px; }
        .row-hdr { display:flex; justify-content:space-between; align-items:center; }
        .title { font-size:10px; font-weight:700; letter-spacing:.08em; color:#58a6ff; }
        .close { background:none; border:none; color:#8b949e; font-size:18px; cursor:pointer; padding:0; line-height:1; }
        .close:hover { color:#c9d1d9; }

        .range-label { margin:0; font-size:10px; color:#8b949e; text-align:center; }

        .presets { display:flex; gap:4px; flex-wrap:wrap; }
        .chip {
          flex: 1;
          min-width: 38px;
          background:#0d1117; border:1px solid #30363d; border-radius:4px;
          color:#8b949e; font-family:inherit; font-size:10px; font-weight:600;
          padding:5px 0; cursor:pointer;
        }
        .chip:hover:not(:disabled) { border-color:#388bfd; color:#c9d1d9; }
        .chip--active { background:#132235; border-color:#58a6ff; color:#58a6ff; }
        .chip:disabled { opacity:.5; cursor:not-allowed; }

        .custom-toggle {
          background:none; border:none; color:#484f58; font-family:inherit;
          font-size:9px; letter-spacing:.05em; cursor:pointer; padding:2px 0; text-align:left;
        }
        .custom-toggle:hover { color:#8b949e; }

        .custom { display:flex; flex-direction:column; gap:6px; padding-top:2px; }
        .field { display:flex; flex-direction:column; gap:2px; }
        .label { font-size:9px; color:#8b949e; letter-spacing:.06em; }
        .input { background:#0d1117; border:1px solid #30363d; border-radius:4px; color:#c9d1d9; font-family:inherit; font-size:10px; padding:4px 6px; width:100%; color-scheme:dark; }
        .input:focus { outline:none; border-color:#58a6ff; }
        .btn { background:#1c2128; border:1px solid #388bfd; border-radius:4px; color:#58a6ff; font-family:inherit; font-size:11px; font-weight:600; padding:5px; cursor:pointer; }
        .btn:hover:not(:disabled) { background:#132235; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }

        .hint { margin:0; font-size:10px; color:#8b949e; text-align:center; }
        .ok  { margin:0; font-size:10px; color:#3fb950; text-align:center; }
        .bad { margin:0; font-size:10px; color:#f85149; word-break:break-word; text-align:center; }
      `}</style>
    </div>
  );
}
