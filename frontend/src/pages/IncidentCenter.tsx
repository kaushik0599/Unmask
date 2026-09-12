import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConsoleShell from "@/components/ConsoleShell";
import { listIncidents, type Incident, type Severity, ApiError } from "@/lib/api";
import { relativeTime } from "@/lib/format";

type LoadState = "loading" | "ready" | "empty" | "unavailable" | "error";

const SEVERITIES: Array<Severity | "all"> = ["all", "critical", "high", "medium", "low"];
const STATUSES = ["all", "open", "resolved"];

export default function IncidentCenter() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

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

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (severity !== "all" && inc.severity !== severity) return false;
      if (status !== "all" && inc.status !== status) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!inc.title.toLowerCase().includes(q) && !inc.website.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [incidents, severity, status, search]);

  return (
    <ConsoleShell>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 32px" }}>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="font-bold" style={{ fontSize: 24, color: "#eaf6ec", letterSpacing: "-0.02em" }}>
            Incident Center
          </h1>
        </div>

        {state === "ready" || state === "empty" ? (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <input
              type="text"
              className="input-cyber"
              placeholder="Search by title or website…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220, flex: "1 1 220px" }}
            />
            <select
              className="input-cyber font-mono"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{ width: 160 }}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All severities" : s.toUpperCase()}</option>
              ))}
            </select>
            <select
              className="input-cyber font-mono"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: 140 }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All statuses" : s.toUpperCase()}</option>
              ))}
            </select>
          </div>
        ) : null}

        {state === "loading" && (
          <div className="card rounded-xl px-5 py-10 text-center font-mono text-xs" style={{ color: "#4c5b51" }}>
            Loading incidents…
          </div>
        )}
        {state === "unavailable" && (
          <div className="card rounded-xl px-5 py-10 text-center font-mono text-xs" style={{ color: "#ef4444" }}>
            Backend unavailable.
          </div>
        )}
        {state === "error" && (
          <div className="card rounded-xl px-5 py-10 text-center font-mono text-xs" style={{ color: "#ef4444" }}>
            Unable to load incidents.
          </div>
        )}
        {state === "empty" && (
          <div className="card rounded-xl px-5 py-10 text-center font-mono text-xs" style={{ color: "#4c5b51" }}>
            No incidents yet.
          </div>
        )}

        {(state === "ready") && (
          filtered.length === 0 ? (
            <div className="card rounded-xl px-5 py-10 text-center font-mono text-xs" style={{ color: "#4c5b51" }}>
              No incidents match these filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inc) => (
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
                      <div className="flex gap-4 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{inc.website}</span>
                        <span style={{ fontSize: 12, color: "#4c5b51" }}>{relativeTime(inc.updated_at)}</span>
                      </div>
                    </div>
                    <span className="badge badge-info">{inc.status.toUpperCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </ConsoleShell>
  );
}
