"use client";

import { useMemo, useState } from "react";
import { DeviceCard } from "./DeviceCard";
import { useNow } from "@/hooks/useNow";
import { isFresh } from "@/lib/freshness";
import type { DeviceState } from "@/hooks/useFlespiDevice";

interface DeviceListPanelProps {
  devices: DeviceState[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

type FilterKey = "all" | "live" | "stale" | "alerts";
type SortKey = "name" | "recent" | "alerts";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "All" },
  { key: "live",   label: "Live" },
  { key: "stale",  label: "Stale" },
  { key: "alerts", label: "Alerts" },
];

export function DeviceListPanel({ devices, selectedId, onSelect }: DeviceListPanelProps) {
  const now = useNow(1000);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort,   setSort  ] = useState<SortKey>("name");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = devices.filter(d => !q || (d.info?.name ?? "").toLowerCase().includes(q));

    if (filter === "alerts") out = out.filter(d => d.fallDetected);
    else if (filter === "live" || filter === "stale") {
      out = out.filter(d => isFresh(d.latestMessage?.timestamp, now) === (filter === "live"));
    }

    out = [...out].sort((a, b) => {
      if (sort === "name")   return (a.info?.name ?? "").localeCompare(b.info?.name ?? "");
      if (sort === "recent") return (b.latestMessage?.timestamp ?? 0) - (a.latestMessage?.timestamp ?? 0);
      return Number(b.fallDetected) - Number(a.fallDetected);
    });

    return out;
  }, [devices, search, filter, sort, now]);

  return (
    <div className="panel">
      <input
        className="search"
        placeholder="Search devices…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "chip--active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="sort-row">
        <span className="sort-label">SORT</span>
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <option value="name">Name</option>
          <option value="recent">Most recent</option>
          <option value="alerts">Alerts first</option>
        </select>
      </div>

      <div className="list">
        {list.length === 0 && <p className="empty">No devices match.</p>}
        {list.map(dev => (
          <DeviceCard
            key={dev.info?.id}
            device={dev}
            selected={dev.info?.id === selectedId}
            onSelect={() => dev.info && onSelect(dev.info.id)}
          />
        ))}
      </div>

      <style jsx>{`
        .panel { display: flex; flex-direction: column; gap: 8px; }

        .search {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 5px;
          color: #c9d1d9;
          font-family: inherit;
          font-size: 11px;
          padding: 6px 8px;
          width: 100%;
        }
        .search:focus { outline: none; border-color: #58a6ff; }
        .search::placeholder { color: #484f58; }

        .filters { display: flex; gap: 4px; flex-wrap: wrap; }

        .chip {
          background: #161b22;
          border: 1px solid #30363d;
          color: #8b949e;
          border-radius: 4px;
          padding: 3px 8px;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
        }
        .chip--active { background: #132235; border-color: #58a6ff; color: #58a6ff; }

        .sort-row { display: flex; align-items: center; gap: 8px; }
        .sort-label { font-size: 9px; color: #484f58; letter-spacing: 0.08em; }
        .sort-select {
          flex: 1;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 4px;
          color: #c9d1d9;
          font-family: inherit;
          font-size: 10px;
          padding: 4px 6px;
        }

        .list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
        .empty { font-size: 11px; color: #484f58; margin: 8px 0; }
      `}</style>
    </div>
  );
}
