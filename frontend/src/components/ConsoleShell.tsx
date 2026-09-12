import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { listIncidents, type Incident } from "@/lib/api";
import { relativeTime, severityDotColor } from "@/lib/format";
import { useExtensionStatus } from "@/lib/extensionStatus";

const NAV_ITEMS = [
  {
    path: "/console",
    label: "Overview",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: "/console/investigate",
    label: "Investigate",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    path: "/console/incidents",
    label: "Incidents",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    // No dedicated activity feed exists yet - the closest real thing is the
    // incident stream, so this points there rather than a fabricated page.
    path: "/console/incidents",
    label: "Activity",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [recent, setRecent] = useState<Incident[] | null>(null);
  const [recentError, setRecentError] = useState(false);
  const ext = useExtensionStatus();

  useEffect(() => {
    let cancelled = false;
    listIncidents()
      .then((list) => { if (!cancelled) setRecent(list.slice(0, 3)); })
      .catch(() => { if (!cancelled) setRecentError(true); });
    return () => { cancelled = true; };
  }, []);

  const isActive = (path: string) =>
    path === "/console" ? location.pathname === "/console" : location.pathname.startsWith(path);

  const protection = [
    { label: "Extension", status: ext.extensionConnected ? "CONNECTED" : "DISCONNECTED", ok: ext.extensionConnected },
    { label: "Data X-Ray", status: ext.dataXRayActive ? "ACTIVE" : "INACTIVE", ok: ext.dataXRayActive },
    { label: "Firewall", status: ext.firewallActive ? "ACTIVE" : "INACTIVE", ok: ext.firewallActive },
    { label: "Trust Gate", status: "NOT ENABLED", ok: false },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
          <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
            <path d="M14 2L24 6.5V15C24 21 14 26 14 26C14 26 4 21 4 15V6.5Z" fill="rgba(14,165,233,0.1)" stroke="#0ea5e9" strokeWidth="1.5" />
            <path d="M9 14L13 18L20 11" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.1em", color: "#e8e2d8" }}>UNMASK</span>
        </button>
      </div>

      <div className="sidebar-workspace px-3 py-4 flex-1">
        <div className="sidebar-label font-mono mb-2 px-3" style={{ fontSize: 9, color: "#44506a", letterSpacing: "0.1em" }}>
          WORKSPACE
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`nav-item w-full ${isActive(item.path) ? "active" : ""}`}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-recent mt-8">
          <div className="font-mono mb-2 px-3" style={{ fontSize: 9, color: "#44506a", letterSpacing: "0.1em" }}>
            RECENT INCIDENTS
          </div>
          <div className="space-y-1">
            {recentError && (
              <div className="px-3 py-2 font-mono text-xs" style={{ color: "#44506a" }}>Backend unavailable.</div>
            )}
            {!recentError && recent !== null && recent.length === 0 && (
              <div className="px-3 py-2 font-mono text-xs" style={{ color: "#44506a" }}>No incidents yet.</div>
            )}
            {recent?.map((inc) => (
              <button
                key={inc.id}
                onClick={() => navigate(`/console/incidents/${inc.id}`)}
                className="w-full text-left px-3 py-2.5 rounded-md transition-all duration-150"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`status-dot status-dot-${severityDotColor(inc.severity)} flex-shrink-0`} />
                  <span className="font-mono text-xs truncate" style={{ color: "#44506a" }}>{inc.website}</span>
                </div>
                <div style={{ fontSize: 11, color: "#44506a", paddingLeft: 14 }} className="truncate">
                  {relativeTime(inc.updated_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-status px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="font-mono text-xs mb-3" style={{ color: "#44506a", letterSpacing: "0.06em" }}>PROTECTION STATUS</div>
        {protection.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1.5">
            <span style={{ fontSize: 12, color: "#8a94a8" }}>{s.label}</span>
            <div className="flex items-center gap-1.5">
              <span className={`status-dot status-dot-${s.ok ? "green" : "grey"}`} />
              <span className="font-mono" style={{ fontSize: 10, color: s.ok ? "#22c55e" : "#44506a" }}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <div className="console-layout">
      <Sidebar />
      <main className="console-main">{children}</main>
    </div>
  );
}
