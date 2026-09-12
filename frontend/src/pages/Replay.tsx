import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIncident, type Incident, type UnmaskEvent, ApiError } from "@/lib/api";
import { clockTime, shortHash } from "@/lib/format";

type LoadState = "loading" | "ready" | "unavailable" | "notfound" | "error";

type NodeId = "site" | "field" | "fingerprint" | "script" | "path" | "firewall" | "blocked" | "incident";

interface Beat {
  t: number;
  label: string;
  detail: string;
  type: "info" | "observed" | "warning" | "blocked" | "incident";
  nodeActive: NodeId;
}

function pickPrimaryEvent(events: UnmaskEvent[]): UnmaskEvent | null {
  if (events.length === 0) return null;
  const blocked = events.find((e) => e.action === "BLOCKED");
  if (blocked) return blocked;
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...events].sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))[0];
}

// Beats are a presentation-only decomposition of one real recorded event's
// fields into a stepped narrative - every label/detail is sourced directly
// from that event. No stage is invented that the evidence doesn't support.
function buildBeats(incident: Incident, event: UnmaskEvent | null): Beat[] {
  const beats: Beat[] = [
    { t: 0, label: "Website loads", detail: incident.website, type: "info", nodeActive: "site" },
  ];
  if (!event) return beats;

  const blocked = event.action === "BLOCKED";

  if (event.field_type) {
    beats.push({
      t: 16,
      label: `${event.field_type} field discovered`,
      detail: `field_id: ${event.metadata?.field_id ?? "unknown"}`,
      type: "observed",
      nodeActive: "field",
    });
  }
  if (event.metadata?.field_hash) {
    beats.push({
      t: 32,
      label: "Value fingerprinted",
      detail: `${shortHash(event.metadata.field_hash)} — computed locally, never stored`,
      type: "observed",
      nodeActive: "fingerprint",
    });
  }
  beats.push({
    t: 50,
    label: "Script executes",
    detail: `${event.script_origin ?? "unknown origin"} initiates ${event.vector ?? "request"}`,
    type: blocked ? "warning" : "observed",
    nodeActive: "script",
  });
  beats.push({
    t: 66,
    label: "Destination evaluated",
    detail: `${event.destination ?? "unknown"} — policy: ${event.policy ?? "unavailable"}`,
    type: blocked ? "warning" : "observed",
    nodeActive: "path",
  });
  if (blocked) {
    beats.push({ t: 84, label: "Firewall intercepts", detail: event.policy ?? "cross-site egress policy", type: "warning", nodeActive: "firewall" });
    beats.push({ t: 94, label: "Request blocked", detail: "Network operation terminated before execution", type: "blocked", nodeActive: "blocked" });
  } else {
    beats.push({ t: 84, label: "Request allowed", detail: "No policy violation detected", type: "observed", nodeActive: "firewall" });
  }
  beats.push({
    t: 100,
    label: "Incident recorded",
    detail: `${incident.id} · ${incident.severity.toUpperCase()}`,
    type: "incident",
    nodeActive: "incident",
  });
  return beats;
}

export default function Replay() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
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

  const events = incident?.events ?? [];
  const primaryEvent = useMemo(() => pickPrimaryEvent(events), [events]);
  const beats = useMemo(() => (incident ? buildBeats(incident, primaryEvent) : []), [incident, primaryEvent]);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentBeat = beats.reduce((acc, b) => (b.t <= progress ? b : acc), beats[0]);
  const activeNode = currentBeat?.nodeActive;
  const isBlocked = primaryEvent?.action === "BLOCKED" && progress >= 94;
  const isAttacking = primaryEvent?.action === "BLOCKED" && progress >= 84;

  const tick = useCallback(() => {
    setProgress((p) => {
      if (p >= 100) { setPlaying(false); return 100; }
      return Math.min(100, p + 0.5 * speed);
    });
  }, [speed]);

  useEffect(() => {
    if (playing) intervalRef.current = setInterval(tick, 60);
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, tick]);

  const restart = () => { setProgress(0); setPlaying(false); };
  const toggle = () => {
    if (progress >= 100) { setProgress(0); setPlaying(true); }
    else setPlaying((p) => !p);
  };

  const nc = (nodeId: NodeId) => {
    const isActive = activeNode === nodeId;
    const isPast = beats.findIndex((b) => b.nodeActive === nodeId) < beats.findIndex((b) => b.nodeActive === activeNode);
    if (nodeId === "blocked") return isActive ? "#ef4444" : "rgba(255,255,255,0.04)";
    if (nodeId === "firewall" || nodeId === "incident") return isActive ? (isBlocked || nodeId === "incident" ? "#ef4444" : "#22c55e") : isPast ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)";
    if (nodeId === "script" || nodeId === "path") return isActive ? "#f59e0b" : isPast ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.04)";
    if (isActive) return "#0ea5e9";
    if (isPast) return "rgba(14,165,233,0.12)";
    return "rgba(255,255,255,0.04)";
  };
  const nbc = (nodeId: NodeId) => {
    const isActive = activeNode === nodeId;
    if (nodeId === "blocked" || nodeId === "firewall" || nodeId === "incident") return isActive ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.07)";
    if (nodeId === "script" || nodeId === "path") return isActive ? "rgba(217,119,6,0.5)" : "rgba(255,255,255,0.07)";
    return isActive ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.07)";
  };

  const nodeVisible = (id: NodeId) => beats.some((b) => b.nodeActive === id);
  const nodeProgressThreshold = (id: NodeId) => beats.find((b) => b.nodeActive === id)?.t ?? 101;

  if (state === "loading") return <CenteredMessage text="Loading incident…" color="#44506a" />;
  if (state === "unavailable") return <CenteredMessage text="Backend unavailable." color="#ef4444" onBack={() => navigate(-1)} />;
  if (state === "notfound") return <CenteredMessage text="Incident not found." color="#44506a" onBack={() => navigate("/console/incidents")} />;
  if (state === "error" || !incident) return <CenteredMessage text="Unable to load incident." color="#ef4444" onBack={() => navigate(-1)} />;

  if (events.length === 0) {
    return (
      <CenteredMessage
        text="No events recorded for this incident yet — nothing to replay."
        color="#44506a"
        onBack={() => navigate(`/console/incidents/${incident.id}`)}
      />
    );
  }

  return (
    <div style={{ background: "#0b0d11", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3" style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/console/incidents/${incident.id}`)} className="flex items-center gap-2" style={{ color: "#44506a", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Incident {incident.id}
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
          <span className="font-mono text-xs" style={{ color: "#0ea5e9", letterSpacing: "0.1em" }}>INCIDENT REPLAY</span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs"
          style={{
            background: isBlocked ? "rgba(220,38,38,0.1)" : isAttacking ? "rgba(217,119,6,0.1)" : "rgba(14,165,233,0.08)",
            border: `1px solid ${isBlocked ? "rgba(220,38,38,0.3)" : isAttacking ? "rgba(217,119,6,0.3)" : "rgba(14,165,233,0.2)"}`,
            color: isBlocked ? "#ef4444" : isAttacking ? "#f59e0b" : "#0ea5e9",
            transition: "all 0.5s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "block" }} />
          {isBlocked ? "BLOCKED" : isAttacking ? "ATTACKING" : progress === 0 ? "READY" : "OBSERVED"}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.03 }}>
            <defs>
              <pattern id="rg" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0ea5e9" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#rg)" />
          </svg>

          <div className="relative" style={{ width: "100%", maxWidth: 640, perspective: "1000px" }}>
            <svg width="100%" viewBox="0 0 640 440" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))" }}>
              <defs>
                <marker id="rArr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="rgba(14,165,233,0.5)" /></marker>
                <marker id="rArrRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="rgba(220,38,38,0.7)" /></marker>
                <marker id="rArrAmber" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="rgba(217,119,6,0.7)" /></marker>
              </defs>

              {[60, 150, 240, 330, 400].map((y, i) => (
                <rect key={i} x="40" y={y - 10} width="560" height="60" rx="4" fill={`rgba(255,255,255,0.00${i + 1})`} stroke={`rgba(255,255,255,0.0${i + 1}5)`} strokeWidth="0.5" />
              ))}

              <g opacity={1} style={{ transition: "opacity 0.5s" }}>
                <rect x="240" y="50" width="160" height="50" rx="6" fill={nc("site")} stroke={nbc("site")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                <text x="320" y="70" textAnchor="middle" fill="#e8e2d8" fontSize="10" fontFamily="JetBrains Mono">WEBSITE</text>
                <text x="320" y="86" textAnchor="middle" fill="#44506a" fontSize="8" fontFamily="JetBrains Mono">{incident.website}</text>
              </g>

              {nodeVisible("field") && (
                <g opacity={progress >= nodeProgressThreshold("field") ? 1 : 0.15} style={{ transition: "opacity 0.5s" }}>
                  <rect x="80" y="150" width="140" height="44" rx="5" fill={nc("field")} stroke={nbc("field")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                  <text x="150" y="170" textAnchor="middle" fill="#e8e2d8" fontSize="9" fontFamily="JetBrains Mono">{(primaryEvent?.field_type ?? "FIELD").toUpperCase()}</text>
                  <text x="150" y="184" textAnchor="middle" fill="#44506a" fontSize="7.5" fontFamily="JetBrains Mono">{primaryEvent?.metadata?.field_id ?? ""}</text>
                </g>
              )}

              {nodeVisible("fingerprint") && (
                <g opacity={progress >= nodeProgressThreshold("fingerprint") ? 1 : 0.15} style={{ transition: "opacity 0.5s" }}>
                  <rect x="80" y="230" width="140" height="44" rx="5" fill={nc("fingerprint")} stroke={nbc("fingerprint")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                  <text x="150" y="249" textAnchor="middle" fill="#e8e2d8" fontSize="9" fontFamily="JetBrains Mono">FINGERPRINT</text>
                  <text x="150" y="263" textAnchor="middle" fill="#8b5cf6" fontSize="7.5" fontFamily="JetBrains Mono">{shortHash(primaryEvent?.metadata?.field_hash)}</text>
                </g>
              )}

              <g opacity={progress >= nodeProgressThreshold("script") ? 1 : 0.15} style={{ transition: "opacity 0.5s" }}>
                <rect x="420" y="150" width="160" height="44" rx="5" fill={nc("script")} stroke={nbc("script")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                <text x="500" y="169" textAnchor="middle" fill={isAttacking ? "#f59e0b" : "#e8e2d8"} fontSize="9" fontFamily="JetBrains Mono">SCRIPT</text>
                <text x="500" y="183" textAnchor="middle" fill="#44506a" fontSize="7.5" fontFamily="JetBrains Mono">{primaryEvent?.script_origin ?? "unknown"}</text>
              </g>

              <g opacity={progress >= nodeProgressThreshold("firewall") ? 1 : 0.15} style={{ transition: "opacity 0.5s" }}>
                <rect x="420" y="250" width="160" height="44" rx="5" fill={nc("firewall")} stroke={nbc("firewall")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                <text x="500" y="269" textAnchor="middle" fill={isBlocked ? "#ef4444" : "#e8e2d8"} fontSize="9" fontFamily="JetBrains Mono">UNMASK FIREWALL</text>
                <text x="500" y="283" textAnchor="middle" fill="#44506a" fontSize="7.5" fontFamily="JetBrains Mono">{primaryEvent?.policy ?? "policy unavailable"}</text>
              </g>

              <g opacity={progress >= nodeProgressThreshold("path") ? 1 : 0.1} style={{ transition: "opacity 0.5s" }}>
                <rect x="420" y="350" width="160" height="44" rx="5"
                  fill={isBlocked ? "rgba(255,255,255,0.02)" : "rgba(34,197,94,0.06)"}
                  stroke={isBlocked ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.25)"} strokeWidth="1"
                  style={{ transition: "fill 0.5s, stroke 0.5s" }}
                  strokeDasharray={isBlocked ? "4 2" : "none"}
                />
                <text x="500" y="369" textAnchor="middle" fill={isBlocked ? "#44506a" : "#22c55e"} fontSize="9" fontFamily="JetBrains Mono">DESTINATION</text>
                <text x="500" y="383" textAnchor="middle" fill={isBlocked ? "#44506a" : "#86efac"} fontSize="7.5" fontFamily="JetBrains Mono" opacity="0.8">{primaryEvent?.destination ?? "unknown"}</text>
                {isBlocked && <text x="500" y="375" textAnchor="middle" fill="#44506a" fontSize="18" fontFamily="JetBrains Mono" opacity="0.3">✕</text>}
              </g>

              <g opacity={progress >= 100 ? 1 : 0.08} style={{ transition: "opacity 0.5s" }}>
                <rect x="200" y="370" width="160" height="44" rx="5" fill={nc("incident")} stroke={nbc("incident")} strokeWidth="1" style={{ transition: "fill 0.5s, stroke 0.5s" }} />
                <text x="280" y="389" textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">INCIDENT CAPTURED</text>
                <text x="280" y="403" textAnchor="middle" fill="#44506a" fontSize="7.5" fontFamily="JetBrains Mono">{incident.id} · {incident.severity.toUpperCase()}</text>
              </g>

              {nodeVisible("field") && <path d="M 270 100 L 150 150" stroke={progress >= nodeProgressThreshold("field") ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.05)"} strokeWidth="1" markerEnd={progress >= nodeProgressThreshold("field") ? "url(#rArr)" : undefined} style={{ transition: "stroke 0.5s" }} />}
              <path d="M 370 100 L 500 150" stroke={progress >= nodeProgressThreshold("script") ? "rgba(217,119,6,0.35)" : "rgba(255,255,255,0.05)"} strokeWidth="1.2" strokeDasharray={progress >= nodeProgressThreshold("script") ? "none" : "4 2"} markerEnd={progress >= nodeProgressThreshold("script") ? "url(#rArrAmber)" : undefined} style={{ transition: "stroke 0.5s" }} />
              {nodeVisible("fingerprint") && <path d="M 150 194 L 150 230" stroke={progress >= nodeProgressThreshold("fingerprint") ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.05)"} strokeWidth="1" markerEnd={progress >= nodeProgressThreshold("fingerprint") ? "url(#rArr)" : undefined} style={{ transition: "stroke 0.5s" }} />}
              <path d="M 500 194 L 500 250" stroke={progress >= nodeProgressThreshold("firewall") ? (isBlocked ? "rgba(220,38,38,0.5)" : "rgba(34,197,94,0.4)") : "rgba(255,255,255,0.05)"} strokeWidth="1.2" markerEnd={progress >= nodeProgressThreshold("firewall") ? "url(#rArrRed)" : undefined} style={{ transition: "stroke 0.5s" }} />
              <path d="M 500 294 L 500 350" stroke={isBlocked ? "rgba(220,38,38,0.25)" : progress >= nodeProgressThreshold("path") ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.05)"} strokeWidth="1" strokeDasharray={isBlocked ? "4 2" : "none"} style={{ transition: "stroke 0.5s" }} />
              <path d="M 480 294 L 360 370" stroke={progress >= 100 ? "rgba(14,165,233,0.25)" : "rgba(255,255,255,0.04)"} strokeWidth="1" markerEnd={progress >= 100 ? "url(#rArr)" : undefined} style={{ transition: "stroke 0.5s" }} />

              {isBlocked && (
                <>
                  <path id="blocked-path" d="M 150 252 L 320 220 L 500 194 L 500 250" stroke="none" />
                  <circle r="3" fill="#ef4444" opacity="0.8">
                    <animateMotion dur="2s" repeatCount="indefinite" keyTimes="0;0.8;1" keyPoints="0;0.8;0.8" calcMode="linear"><mpath href="#blocked-path" /></animateMotion>
                  </circle>
                  <rect x="490" y="300" width="4" height="44" rx="2" fill="#ef4444" opacity="0.7" />
                </>
              )}
              {isAttacking && !isBlocked && (
                <>
                  <path id="exfil-path" d="M 150 252 L 320 220 L 500 194 L 500 250" stroke="none" />
                  <circle r="3" fill="#f59e0b" opacity="0.8">
                    <animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#exfil-path" /></animateMotion>
                  </circle>
                </>
              )}
              {!isAttacking && progress > 0 && progress < 100 && (
                <>
                  <path id="norm-path" d="M 280 100 L 150 150 L 150 230" stroke="none" />
                  <circle r="2.5" fill="#0ea5e9" opacity="0.6">
                    <animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#norm-path" /></animateMotion>
                  </circle>
                </>
              )}
            </svg>

            {progress >= 100 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-6 py-4 text-center" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", animation: "fadeUp 0.5s ease", minWidth: 300, backdropFilter: "blur(8px)" }}>
                <div className="badge badge-critical mb-2">INCIDENT CAPTURED</div>
                <div className="font-bold" style={{ fontSize: 14, color: "#e8e2d8", marginBottom: 4 }}>{incident.title}</div>
                <div className="font-mono text-xs" style={{ color: "#44506a" }}>{incident.id} · {incident.severity.toUpperCase()} · {incident.website}</div>
                <button className="btn-primary mt-4" style={{ fontSize: 12 }} onClick={() => navigate(`/console/incidents/${incident.id}`)}>
                  Open Incident →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d1117", flexShrink: 0 }}>
          <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={restart} className="btn-ghost p-2 rounded-lg" title="Restart" style={{ padding: "8px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
              </button>
              <button onClick={toggle} className="btn-primary flex-1 py-2.5" style={{ fontSize: 13 }}>
                {playing ? "Pause" : progress >= 100 ? "Replay" : "Play"}
              </button>
              <div className="flex gap-1">
                {[1, 2, 4].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)} className="font-mono text-xs px-2.5 py-2 rounded transition-all"
                    style={{ background: speed === s ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${speed === s ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.06)"}`, color: speed === s ? "#0ea5e9" : "#44506a" }}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            <input type="range" min="0" max="100" step="0.5" value={progress} onChange={(e) => { setProgress(Number(e.target.value)); setPlaying(false); }} className="w-full" style={{ accentColor: "#0ea5e9", cursor: "pointer", height: 4 }} />
            <div className="flex justify-between font-mono mt-1" style={{ fontSize: 10, color: "#44506a" }}>
              <span>0%</span>
              <span>{progress.toFixed(0)}%</span>
              <span>100%</span>
            </div>

            {currentBeat && (
              <div className="mt-4 rounded-lg px-3 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="font-mono text-xs mb-1" style={{ color: "#44506a" }}>CURRENT EVENT</div>
                <div style={{ fontSize: 13, color: "#e8e2d8", fontWeight: 500 }}>{currentBeat.label}</div>
                <div className="font-mono mt-1" style={{ fontSize: 10, color: "#44506a" }}>{currentBeat.detail}</div>
                {primaryEvent && <div className="font-mono mt-1" style={{ fontSize: 10, color: "#2d3748" }}>recorded at {clockTime(primaryEvent.timestamp)}</div>}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="font-mono text-xs mb-4" style={{ color: "#44506a", letterSpacing: "0.1em" }}>EVENT LOG</div>
            <div className="space-y-3">
              {beats.map((b, i) => {
                const isVisible = b.t <= progress;
                const isCurrent = b === currentBeat;
                return (
                  <div key={i} className="flex items-start gap-3 transition-all duration-300" style={{ opacity: isVisible ? 1 : 0.15 }}>
                    <div className="flex-shrink-0 mt-0.5" style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: b.type === "blocked" ? "rgba(220,38,38,0.2)" : b.type === "warning" ? "rgba(217,119,6,0.15)" : b.type === "incident" ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${isCurrent ? (b.type === "blocked" ? "#ef4444" : b.type === "warning" ? "#f59e0b" : "#0ea5e9") : "rgba(255,255,255,0.08)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {isVisible && <span style={{ fontSize: 8, color: b.type === "blocked" ? "#ef4444" : b.type === "warning" ? "#f59e0b" : "#0ea5e9" }}>●</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? "#e8e2d8" : "#8a94a8" }}>{b.label}</div>
                      {isCurrent && <div className="font-mono mt-0.5" style={{ fontSize: 10, color: "#44506a" }}>{b.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({ text, color, onBack }: { text: string; color: string; onBack?: () => void }) {
  return (
    <div style={{ background: "#0b0d11", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div className="font-mono text-sm" style={{ color }}>{text}</div>
      {onBack && <button className="btn-ghost" style={{ fontSize: 13 }} onClick={onBack}>← Back</button>}
    </div>
  );
}
