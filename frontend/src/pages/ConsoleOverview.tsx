import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConsoleShell from "@/components/ConsoleShell";
import { listIncidents, type Incident, ApiError } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useExtensionStatus } from "@/lib/extensionStatus";

type LoadState = "loading" | "ready" | "empty" | "unavailable" | "error";

export default function ConsoleOverview() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const ext = useExtensionStatus();

  useEffect(() => {
    let cancelled = false;
    listIncidents()
      .then((list) => {
        if (cancelled) return;
        setIncidents(list);
        setState(list.length === 0 ? "empty" : "ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.kind === "network" ? "unavailable" : "error");
      });
    return () => { cancelled = true; };
  }, []);

  const handleInvestigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) navigate(`/console/investigate?url=${encodeURIComponent(url.trim())}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const openCount = incidents.filter((i) => i.status === "open").length;

  return (
    <ConsoleShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
        <div className="mb-12">
          <h1 className="font-bold mb-2" style={{ fontSize: 28, color: "#eaf6ec", letterSpacing: "-0.02em" }}>
            {greeting}.
          </h1>
          <p style={{ color: "#8fa695", fontSize: 15 }}>
            {ext.extensionConnected
              ? "Your browser is protected. UNMASK is watching sensitive data movement across your active session."
              : "Extension disconnected. Install and enable the UNMASK extension to begin watching live browser sessions."}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "EXTENSION", ok: ext.extensionConnected, on: "CONNECTED", off: "DISCONNECTED" },
            { label: "DATA X-RAY", ok: ext.dataXRayActive, on: "ACTIVE", off: "INACTIVE" },
            { label: "FIREWALL", ok: ext.firewallActive, on: "ACTIVE", off: "INACTIVE" },
            { label: "TRUST GATE", ok: false, on: "ACTIVE", off: "NOT ENABLED" },
          ].map((item) => (
            <div key={item.label} className="card rounded-xl px-4 py-4">
              <div className="font-mono text-xs mb-2" style={{ color: "#4c5b51", letterSpacing: "0.08em" }}>{item.label}</div>
              <div className="flex items-center gap-2">
                <span className={`status-dot status-dot-${item.ok ? "green" : "grey"}`} />
                <span className="font-mono text-xs font-semibold" style={{ color: item.ok ? "#22c55e" : "#4c5b51" }}>
                  {item.ok ? item.on : item.off}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card rounded-2xl p-8 mb-10">
          <h2 className="font-semibold mb-2" style={{ fontSize: 18, color: "#eaf6ec" }}>Investigate a website</h2>
          <p className="mb-6" style={{ color: "#8fa695", fontSize: 14 }}>
            Enter any URL to review identity, scripts, data destinations, and risk indicators.
          </p>
          <form onSubmit={handleInvestigate} className="flex gap-3 flex-wrap">
            <input
              type="text"
              className="input-cyber flex-1"
              placeholder="Enter a URL to investigate…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
              Investigate
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ fontSize: 16, color: "#eaf6ec" }}>Recent Incidents</h2>
            <button
              className="font-mono text-xs"
              style={{ color: "#3bff6e", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              onClick={() => navigate("/console/incidents")}
            >
              View all →
            </button>
          </div>

          {state === "loading" && (
            <div className="card rounded-xl px-5 py-8 text-center font-mono text-xs" style={{ color: "#4c5b51" }}>
              Loading incidents…
            </div>
          )}
          {state === "unavailable" && (
            <div className="card rounded-xl px-5 py-8 text-center font-mono text-xs" style={{ color: "#ef4444" }}>
              Backend unavailable.
            </div>
          )}
          {state === "error" && (
            <div className="card rounded-xl px-5 py-8 text-center font-mono text-xs" style={{ color: "#ef4444" }}>
              Unable to load incidents.
            </div>
          )}
          {state === "empty" && (
            <div className="card rounded-xl px-5 py-8 text-center font-mono text-xs" style={{ color: "#4c5b51" }}>
              No incidents yet.
            </div>
          )}

          {state === "ready" && (
            <div className="space-y-3">
              {incidents.slice(0, 6).map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => navigate(`/console/incidents/${inc.id}`)}
                  className="card card-hover w-full text-left rounded-xl px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 w-1 self-stretch rounded-full"
                      style={{ background: inc.severity === "critical" ? "#ef4444" : inc.severity === "high" ? "#f87171" : inc.severity === "medium" ? "#fbbf24" : "#8fa695" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className={`badge badge-${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#eaf6ec" }}>{inc.title}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{inc.website}</span>
                        <span style={{ fontSize: 12, color: "#4c5b51" }}>{relativeTime(inc.updated_at)}</span>
                        <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{inc.event_count ?? 0} event(s)</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <span className="badge badge-info">{inc.status.toUpperCase()}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4c5b51" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {state === "ready" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
            {[
              { label: "Total incidents", val: incidents.length },
              { label: "Critical severity", val: criticalCount },
              { label: "Open status", val: openCount },
            ].map((s) => (
              <div key={s.label} className="card rounded-xl px-5 py-5">
                <div className="font-bold mb-1" style={{ fontSize: 28, color: "#eaf6ec" }}>{s.val}</div>
                <div style={{ fontSize: 13, color: "#8fa695" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
