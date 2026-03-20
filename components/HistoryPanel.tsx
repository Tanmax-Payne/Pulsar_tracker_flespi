"use client";

import { useState, useCallback } from "react";
import { getMessageRange, Message } from "@/lib/flespiApi";

interface HistoryPanelProps {
  deviceId: number;
  onTrack: (points: Array<[number, number]>) => void;
  onClose: () => void;
}

type Status = "idle" | "loading" | "done" | "error";

function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function HistoryPanel({ deviceId, onTrack, onClose }: HistoryPanelProps) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setHours(d.getHours()-1); return toLocalIso(d); });
  const [to,   setTo  ] = useState(() => toLocalIso(new Date()));
  const [status, setStatus] = useState<Status>("idle");
  const [count,  setCount ] = useState(0);
  const [err,    setErr   ] = useState("");

  const load = useCallback(async () => {
    const fromTs = Math.floor(new Date(from).getTime() / 1000);
    const toTs   = Math.floor(new Date(to  ).getTime() / 1000);
    if (fromTs >= toTs)          { setErr("'From' must be before 'To'"); return; }
    if (toTs - fromTs > 86400*7) { setErr("Max range: 7 days"); return; }

    setStatus("loading"); setErr("");
    try {
      const msgs: Message[] = await getMessageRange(deviceId, fromTs, toTs, 500);
      const pts = msgs
        .filter(m => m["position.latitude"] != null && m["position.longitude"] != null)
        .map(m => [m["position.latitude"]!, m["position.longitude"]!] as [number, number]);
      setCount(pts.length);
      onTrack(pts);
      setStatus("done");
    } catch (e) {
      setErr((e as Error).message);
      setStatus("error");
    }
  }, [deviceId, from, to, onTrack]);

  return (
    <div className="panel">
      <div className="row-hdr">
        <span className="title">⏱ HISTORY</span>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </div>

      {(["From", "To"] as const).map(label => (
        <div key={label} className="field">
          <span className="label">{label.toUpperCase()}</span>
          <input
            type="datetime-local"
            className="input"
            value={label === "From" ? from : to}
            onChange={e => label === "From" ? setFrom(e.target.value) : setTo(e.target.value)}
          />
        </div>
      ))}

      <button className="btn" onClick={load} disabled={status === "loading"}>
        {status === "loading" ? "⟳ Fetching…" : "Load Track"}
      </button>

      {status === "done"  && <p className="ok">✓ {count} point{count !== 1 ? "s" : ""} plotted</p>}
      {(err || status === "error") && <p className="bad">{err}</p>}

      <style jsx>{`
        .panel { background:#161b22; border:1px solid #30363d; border-radius:6px; padding:10px; font-family:"IBM Plex Mono",monospace; font-size:11px; display:flex; flex-direction:column; gap:6px; }
        .row-hdr { display:flex; justify-content:space-between; align-items:center; }
        .title { font-size:10px; font-weight:700; letter-spacing:.08em; color:#58a6ff; }
        .close { background:none; border:none; color:#8b949e; font-size:18px; cursor:pointer; padding:0; line-height:1; }
        .close:hover { color:#c9d1d9; }
        .field { display:flex; flex-direction:column; gap:2px; }
        .label { font-size:9px; color:#8b949e; letter-spacing:.06em; }
        .input { background:#0d1117; border:1px solid #30363d; border-radius:4px; color:#c9d1d9; font-family:inherit; font-size:10px; padding:4px 6px; width:100%; color-scheme:dark; }
        .input:focus { outline:none; border-color:#58a6ff; }
        .btn { background:#1c2128; border:1px solid #388bfd; border-radius:4px; color:#58a6ff; font-family:inherit; font-size:11px; font-weight:600; padding:5px; cursor:pointer; }
        .btn:hover:not(:disabled) { background:#132235; }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .ok  { margin:0; font-size:10px; color:#3fb950; text-align:center; }
        .bad { margin:0; font-size:10px; color:#f85149; word-break:break-word; }
      `}</style>
    </div>
  );
}
