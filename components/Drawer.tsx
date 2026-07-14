"use client";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Everything that isn't "map + freshness" lives here: device list,
// filters/sort, full parameter grid. Closed by default — opened on demand.
export function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <aside className={`drawer ${open ? "drawer--open" : ""}`} aria-hidden={!open}>
        <button className="close" onClick={onClose} aria-label="Close panel">×</button>
        <div className="content">{children}</div>
      </aside>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(1, 4, 9, 0.55);
          z-index: 1400;
          animation: fade-in 0.15s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(360px, 92vw);
          background: var(--bg);
          border-left: 1px solid var(--border);
          z-index: 1500;
          transform: translateX(100%);
          transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          font-family: "IBM Plex Mono", monospace;
        }

        .drawer--open {
          transform: translateX(0);
        }

        .close {
          position: absolute;
          top: 8px;
          right: 10px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          padding: 4px;
          z-index: 1;
        }

        .close:hover { color: var(--text); }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 40px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          scrollbar-width: thin;
          scrollbar-color: var(--border-strong) transparent;
        }
      `}</style>
    </>
  );
}
