import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConsoleShell from "@/components/ConsoleShell";
import { getIncident, explainIncident, type Incident, type UnmaskEvent, type Explanation, ApiError } from "@/lib/api";
import { relativeTime, clockTime, shortHash } from "@/lib/format";

type LoadState = "loading" | "ready" | "unavailable" | "notfound" | "error";

function pickPrimaryEvent(events: UnmaskEvent[]): UnmaskEvent | null {
  if (events.length === 0) return null;
  const blocked = events.find((e) => e.action === "BLOCKED");
  if (blocked) return blocked;
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...events].sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))[0];
}

function siteState(events: UnmaskEvent[]): "UNKNOWN" | "VERIFIED" | "ATTACKING" {
  if (events.length === 0) return "UNKNOWN";
  if (events.some((e) => e.action === "BLOCKED")) return "ATTACKING";
  return "VERIFIED";
}

function AttackChainViz({ event, onReplay }: { event: UnmaskEvent | null; onReplay: () => void }) {
  const blocked = event?.action === "BLOCKED";
  const nodes = event
    ? [
        { id: "field", label: event.field_type ? `${event.field_type} field` : "Sensitive field", sub: event.metadata?.field_id ?? "unidentified", color: "#3bff6e" },
        { id: "script", label: event.script_origin ?? "unknown", sub: `${event.vector ?? "unknown"} vector`, color: "#f59e0b" },
        { id: "dest", label: event.destination ?? "unknown", sub: "destination", color: blocked ? "#ef4444" : "#8fa695" },
        { id: "fw", label: "UNMASK Firewall", sub: event.policy ?? "policy unavailable", color: blocked ? "#ef4444" : "#8fa695" },
        { id: "action", label: event.action ?? "OBSERVED", sub: blocked ? "Request terminated" : "Request allowed", color: blocked ? "#ef4444" : "#22c55e" },
      ]
    : [];

  return (
    <div className="card rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="font-mono text-xs" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>ATTACK CHAIN</div>
        <button className="btn-primary" style={{ fontSize: 12, padding: "7px 16px" }} onClick={onReplay} disabled={!event}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Replay Attack
        </button>
      </div>

      {!event ? (
        <div className="text-center py-10 font-mono text-xs" style={{ color: "#4c5b51" }}>
          No events recorded for this incident yet.
        </div>
      ) : (
        <div className="relative">
          <svg className="absolute left-0 top-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
            {[20, 40, 60, 80].map((y, i) => (
              <line key={i} x1="50%" y1={`${y}%`} x2="50%" y2={`${y + 12}%`} stroke={i >= 2 && blocked ? "rgba(220,38,38,0.4)" : "rgba(59,255,110,0.3)"} strokeWidth="0.5" />
            ))}
            <path id="chain-path" d="M 50 8 L 50 92" stroke="none" />
            {blocked && (
              <circle r="1" fill="#ef4444" opacity="0.7">
                <animateMotion dur="3s" repeatCount="indefinite" keyTimes="0;0.75;1" keyPoints="0;0.75;0.75" calcMode="linear">
                  <mpath href="#chain-path" />
                </animateMotion>
              </circle>
            )}
          </svg>

          <div className="relative z-10 space-y-0">
            {nodes.map((node, i) => (
              <div key={node.id} className="flex flex-col items-center">
                <div
                  className="attack-node w-full max-w-xs"
                  style={{
                    borderColor: `${node.color}55`,
                    background: i === 4 && blocked ? "rgba(220,38,38,0.06)" : "rgba(4,7,4,0.9)",
                    ...(i === 4 && blocked ? { animation: "glowPulse 2s ease-in-out infinite" } : {}),
                  }}
                >
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <span className="font-mono font-semibold" style={{ fontSize: 12, color: node.color }}>{node.label}</span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 10, color: "#4c5b51" }}>{node.sub}</span>
                </div>
                {i < nodes.length - 1 && (
                  <div className="flex flex-col items-center my-2">
                    <div style={{ width: 1, height: 20, background: i >= 2 && blocked ? "rgba(220,38,38,0.4)" : "rgba(59,255,110,0.3)" }} />
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M 2 2 L 5 8 L 8 2" stroke={i >= 2 && blocked ? "rgba(220,38,38,0.5)" : "rgba(59,255,110,0.4)"} strokeWidth="1.5" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ event }: { event: UnmaskEvent | null }) {
  if (!event) {
    return (
      <div className="card rounded-xl p-6 mb-6">
        <div className="font-mono text-xs mb-5" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>EVIDENCE</div>
        <div className="font-mono text-xs" style={{ color: "#4c5b51" }}>No evidence recorded.</div>
      </div>
    );
  }

  const blocked = event.action === "BLOCKED";
  const rows: Array<{ label: string; val: string; color: string }> = [
    { label: "FIELD TYPE", val: event.field_type ?? "unknown", color: "#3bff6e" },
    { label: "SCRIPT ORIGIN", val: event.script_origin ?? "unknown", color: "#f59e0b" },
    { label: "DESTINATION", val: event.destination ?? "unknown", color: blocked ? "#ef4444" : "#a9b8ab" },
    { label: "VECTOR", val: event.vector ?? "unknown", color: "#a9b8ab" },
    { label: "POLICY", val: event.policy ?? "unavailable", color: "#a9b8ab" },
    { label: "ACTION", val: event.action ?? "unknown", color: blocked ? "#ef4444" : "#22c55e" },
    { label: "SEVERITY", val: event.severity.toUpperCase(), color: blocked ? "#ef4444" : "#8fa695" },
    { label: "FINGERPRINT", val: shortHash(event.metadata?.field_hash), color: "#8bffb0" },
    { label: "FIELD LENGTH", val: event.metadata?.field_length != null ? String(event.metadata.field_length) : "unavailable", color: "#4c5b51" },
    { label: "TIMESTAMP", val: clockTime(event.timestamp), color: "#4c5b51" },
  ];

  return (
    <div className="card rounded-xl p-6 mb-6">
      <div className="font-mono text-xs mb-5" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>EVIDENCE</div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="font-mono text-xs" style={{ color: "#4c5b51", letterSpacing: "0.08em" }}>{row.label}</span>
            <span className="font-mono text-xs text-right" style={{ color: row.color, maxWidth: 180, overflowWrap: "anywhere" }}>{row.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ events }: { events: UnmaskEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="card rounded-xl p-6 mb-6">
      <div className="font-mono text-xs mb-5" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>FORENSIC TIMELINE</div>
      <div>
        {events.map((event, i) => {
          const type = event.action === "BLOCKED" ? "blocked" : i === events.length - 1 ? "incident" : "observed";
          return (
            <div key={event.event_id} className="timeline-item">
              <div className="flex-shrink-0 mt-0.5">
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: type === "blocked" ? "rgba(220,38,38,0.15)" : type === "incident" ? "rgba(59,255,110,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${type === "blocked" ? "#ef4444" : type === "incident" ? "#3bff6e" : "rgba(255,255,255,0.1)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 9 }}>{type === "blocked" ? "✕" : type === "incident" ? "●" : "○"}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                  <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{clockTime(event.timestamp)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: type === "blocked" ? "#ef4444" : "#eaf6ec" }}>
                    {event.event_type} · {event.action}
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: 11, color: "#4c5b51" }}>
                  {event.script_origin ?? "unknown"} → {event.destination ?? "unknown"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WhyBlocked({ incidentId, primaryAction }: { incidentId: string; primaryAction: string | null }) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    explainIncident(incidentId)
      .then((res) => { if (!cancelled) { setExplanation(res); setState("ready"); } })
      .catch((err) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.kind === "network" ? "unavailable" : "error");
      });
    return () => { cancelled = true; };
  }, [incidentId]);

  const title = primaryAction === "BLOCKED" ? "WHY THIS WAS BLOCKED" : "EXPLANATION";

  return (
    <div className="card rounded-xl p-6 mb-6" style={{ borderColor: "rgba(59,255,110,0.15)" }}>
      <div className="font-mono text-xs mb-4" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>{title}</div>

      {state === "loading" && <p className="font-mono text-xs" style={{ color: "#4c5b51" }}>Generating evidence-based explanation…</p>}
      {state === "unavailable" && <p className="font-mono text-xs" style={{ color: "#ef4444" }}>Backend unavailable.</p>}
      {state === "error" && <p className="font-mono text-xs" style={{ color: "#ef4444" }}>Unable to generate explanation.</p>}

      {state === "ready" && explanation && (
        <>
          <p style={{ fontSize: 14, color: "#a9b8ab", lineHeight: 1.85 }}>{explanation.verdict}</p>
          {explanation.findings.length > 0 && (
            <div className="mt-4 space-y-2">
              {explanation.findings.map((f) => (
                <div key={f.event_id} className="font-mono" style={{ fontSize: 11, color: "#8fa695" }}>
                  [{f.event_index}] {f.statement}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 px-4 py-3 rounded-lg" style={{ background: "rgba(59,255,110,0.05)", border: "1px solid rgba(59,255,110,0.12)" }}>
            <span className="font-mono text-xs" style={{ color: "#3bff6e" }}>
              This decision is based on deterministic evidence, not heuristics or AI inference.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function exportEvidence(incident: Incident) {
  const blob = new Blob([JSON.stringify(incident, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unmask-incident-${incident.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const SITE_STATES = [
  { key: "UNKNOWN", color: "#f59e0b", dot: "amber" },
  { key: "VERIFIED", color: "#22c55e", dot: "green" },
  { key: "ATTACKING", color: "#ef4444", dot: "red" },
] as const;

export default function IncidentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getIncident(id)
      .then((inc) => { if (!cancelled) { setIncident(inc); setState("ready"); } })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.kind === "http" && err.status === 404) setState("notfound");
        else if (err instanceof ApiError && err.kind === "network") setState("unavailable");
        else setState("error");
      });
    return () => { cancelled = true; };
  }, [id]);

  if (state === "loading") {
    return <ConsoleShell><div className="p-12 font-mono text-xs" style={{ color: "#4c5b51" }}>Loading incident…</div></ConsoleShell>;
  }
  if (state === "unavailable") {
    return <ConsoleShell><div className="p-12 font-mono text-xs" style={{ color: "#ef4444" }}>Backend unavailable.</div></ConsoleShell>;
  }
  if (state === "notfound") {
    return <ConsoleShell><div className="p-12 font-mono text-xs" style={{ color: "#4c5b51" }}>Incident not found.</div></ConsoleShell>;
  }
  if (state === "error" || !incident) {
    return <ConsoleShell><div className="p-12 font-mono text-xs" style={{ color: "#ef4444" }}>Unable to load incident.</div></ConsoleShell>;
  }

  const events = incident.events ?? [];
  const primary = pickPrimaryEvent(events);
  const currentState = siteState(events);

  return (
    <ConsoleShell>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 32px" }}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/console")} style={{ color: "#4c5b51", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            ← Overview
          </button>
          <span style={{ color: "#4c5b51" }}>/</span>
          <button style={{ fontSize: 13, color: "#4c5b51", background: "none", border: "none", cursor: "pointer" }} onClick={() => navigate("/console/incidents")}>
            Incidents
          </button>
          <span style={{ color: "#4c5b51" }}>/</span>
          <span style={{ fontSize: 13, color: "#eaf6ec" }}>{incident.id}</span>
        </div>

        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className={`badge badge-${incident.severity}`}>{incident.severity.toUpperCase()}</span>
              <span className="badge badge-info">{incident.status.toUpperCase()}</span>
              <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{incident.id}</span>
            </div>
            <h1 className="font-bold mb-2" style={{ fontSize: 24, color: "#eaf6ec", letterSpacing: "-0.02em" }}>
              {incident.title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-mono text-xs" style={{ color: "#4c5b51" }}>{incident.website}</span>
              <span style={{ fontSize: 12, color: "#4c5b51" }}>{relativeTime(incident.updated_at)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate("/console/incidents")}>
              All Incidents
            </button>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => navigate(`/console/incidents/${incident.id}/replay`)} disabled={events.length === 0}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Open Replay
            </button>
          </div>
        </div>

        <div className="card rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <div className="font-mono text-xs" style={{ color: "#4c5b51", letterSpacing: "0.08em" }}>SITE STATE</div>
          {SITE_STATES.map((s, i, arr) => {
            const isCurrent = s.key === currentState;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs"
                  style={{
                    background: isCurrent ? `${s.color}18` : `${s.color}08`,
                    border: `1px solid ${s.color}${isCurrent ? "50" : "20"}`,
                    color: s.color,
                    opacity: isCurrent ? 1 : 0.45,
                  }}
                >
                  <span className={`status-dot status-dot-${s.dot}`} />
                  {s.key}
                </div>
                {i < arr.length - 1 && (
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                    <path d="M 0 6 L 14 6" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <path d="M 10 3 L 16 6 L 10 9" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AttackChainViz event={primary} onReplay={() => navigate(`/console/incidents/${incident.id}/replay`)} />
            <WhyBlocked incidentId={incident.id} primaryAction={primary?.action ?? null} />
            <Timeline events={events} />
          </div>

          <div>
            <EvidencePanel event={primary} />
            <div className="card rounded-xl p-5">
              <div className="font-mono text-xs mb-4" style={{ color: "#4c5b51", letterSpacing: "0.1em" }}>ACTIONS</div>
              <div className="space-y-2">
                <button
                  className="btn-primary w-full"
                  style={{ fontSize: 13 }}
                  onClick={() => navigate(`/console/incidents/${incident.id}/replay`)}
                  disabled={events.length === 0}
                >
                  Replay Attack
                </button>
                <button className="btn-ghost w-full" style={{ fontSize: 13 }} onClick={() => exportEvidence(incident)}>
                  Export Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
