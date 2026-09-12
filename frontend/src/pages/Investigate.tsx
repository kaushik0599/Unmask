import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConsoleShell from "@/components/ConsoleShell";
import { listIncidents, type Incident, ApiError } from "@/lib/api";
import { relativeTime } from "@/lib/format";

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card rounded-xl p-6 mb-6">
      <div className="font-mono text-xs mb-4" style={{ color: "#44506a", letterSpacing: "0.1em" }}>{title}</div>
      {children}
    </div>
  );
}

function NotAvailable({ reason }: { reason: string }) {
  return (
    <div className="font-mono text-xs" style={{ color: "#44506a" }}>
      Not available — {reason}
    </div>
  );
}

export default function Investigate() {
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("url") ?? "");
  const [target, setTarget] = useState<string | null>(params.get("url"));
  const [related, setRelated] = useState<Incident[] | null>(null);
  const [relatedState, setRelatedState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");

  const parsed = useMemo(() => (target ? parseUrl(target) : null), [target]);

  useEffect(() => {
    if (!parsed) { setRelated(null); setRelatedState("idle"); return; }
    let cancelled = false;
    setRelatedState("loading");
    listIncidents()
      .then((list) => {
        if (cancelled) return;
        setRelated(list.filter((i) => i.website === parsed.hostname));
        setRelatedState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setRelatedState(err instanceof ApiError && err.kind === "network" ? "unavailable" : "error");
      });
    return () => { cancelled = true; };
  }, [parsed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) setTarget(input.trim());
  };

  const openProtected = () => {
    if (!parsed) return;
    // The only genuinely implemented "protection" action from this page:
    // open the real site in a new tab, where the installed extension (if
    // any) observes it in real time. No simulated analysis happens here.
    window.open(parsed.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <ConsoleShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <h1 className="font-bold mb-2" style={{ fontSize: 24, color: "#e8e2d8", letterSpacing: "-0.02em" }}>
          Investigate Website
        </h1>
        <p className="mb-8" style={{ color: "#8a94a8", fontSize: 14 }}>
          Enter a URL to review its identity and any incidents UNMASK has already recorded for it.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8 flex-wrap">
          <input
            type="text"
            className="input-cyber flex-1"
            placeholder="https://example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>Investigate</button>
        </form>

        {!parsed && target && (
          <div className="card rounded-xl p-6 mb-6 font-mono text-xs" style={{ color: "#ef4444" }}>
            Unable to parse that as a URL.
          </div>
        )}

        {parsed && (
          <>
            <SectionCard title="IDENTITY">
              <div className="space-y-2">
                {[
                  ["Hostname", parsed.hostname],
                  ["Protocol", parsed.protocol.replace(":", "")],
                  ["Path", parsed.pathname || "/"],
                  ["Port", parsed.port || "default"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="font-mono text-xs" style={{ color: "#44506a" }}>{label}</span>
                    <span className="font-mono text-xs" style={{ color: "#e8e2d8" }}>{val}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="BEHAVIOR">
              <NotAvailable reason="live behavior is only observed once UNMASK is actively watching a browsing session, not from a static URL lookup." />
            </SectionCard>

            <SectionCard title="SCRIPTS">
              <NotAvailable reason="script attribution requires the UNMASK extension to be running on the actual page." />
            </SectionCard>

            <SectionCard title="DESTINATIONS">
              <NotAvailable reason="network destinations are only known once real requests are observed by the extension." />
            </SectionCard>

            <SectionCard title="DATA RISK">
              {relatedState === "loading" && <div className="font-mono text-xs" style={{ color: "#44506a" }}>Checking incident history…</div>}
              {relatedState === "unavailable" && <div className="font-mono text-xs" style={{ color: "#ef4444" }}>Backend unavailable.</div>}
              {relatedState === "error" && <div className="font-mono text-xs" style={{ color: "#ef4444" }}>Unable to check incident history.</div>}
              {relatedState === "ready" && related && related.length === 0 && (
                <div className="font-mono text-xs" style={{ color: "#44506a" }}>No prior incidents recorded for this site.</div>
              )}
              {relatedState === "ready" && related && related.length > 0 && (
                <div className="space-y-2">
                  <div className="font-mono text-xs mb-2" style={{ color: "#f59e0b" }}>
                    {related.length} prior incident{related.length === 1 ? "" : "s"} recorded for this site.
                  </div>
                  {related.slice(0, 3).map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className={`badge badge-${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                      <span className="font-mono text-xs flex-1 mx-3 truncate" style={{ color: "#c8bfb0" }}>{inc.title}</span>
                      <span className="font-mono text-xs" style={{ color: "#44506a" }}>{relativeTime(inc.updated_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="RECOMMENDATION">
              <p className="mb-4" style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.75 }}>
                {related && related.length > 0
                  ? "UNMASK has recorded prior incidents for this site. Opening it under protection will let Data X-Ray and the Firewall watch for sensitive-data egress in real time."
                  : "UNMASK has no recorded history for this site. Opening it under protection will let Data X-Ray and the Firewall watch for sensitive-data egress in real time."}
              </p>
              <button className="btn-primary" onClick={openProtected}>
                Open with UNMASK Protection
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" />
                </svg>
              </button>
            </SectionCard>
          </>
        )}

        {!target && (
          <div className="card rounded-xl p-10 text-center font-mono text-xs" style={{ color: "#44506a" }}>
            No active investigation. Enter a URL above to begin.
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
