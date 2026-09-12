import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listIncidents } from "@/lib/api";

// ── Shared SVG helpers ────────────────────────────────────────────────────────

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
      <defs>
        <pattern id="lg" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0ea5e9" strokeWidth="0.6" />
        </pattern>
        <radialGradient id="lgf" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopOpacity="1" stopColor="white" />
          <stop offset="100%" stopOpacity="0" stopColor="white" />
        </radialGradient>
        <mask id="lgm">
          <rect width="100%" height="100%" fill="url(#lgf)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#lg)" mask="url(#lgm)" />
    </svg>
  );
}

// Animated data particle traveling along an SVG path
function DataParticle({ pathId, dur, delay = 0, color = "#0ea5e9", r = 3 }: {
  pathId: string; dur: number; delay?: number; color?: string; r?: number;
}) {
  return (
    <circle r={r} fill={color} opacity="0.9">
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`}>
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  );
}

// ── Hero Browser Visualization ────────────────────────────────────────────────

function HeroBrowserViz() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 2600);
    return () => clearInterval(t);
  }, []);

  const isAttacking = step >= 3;

  return (
    <div className="relative w-full" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div
        className="absolute rounded-2xl"
        style={{
          inset: "20px -10px -10px -10px",
          background: "rgba(14,165,233,0.04)",
          border: "1px solid rgba(14,165,233,0.08)",
          transform: "perspective(800px) rotateX(4deg) translateY(8px)",
          zIndex: 0,
        }}
      />
      <div
        className="absolute rounded-2xl"
        style={{
          inset: "30px -20px -20px -20px",
          background: "rgba(14,165,233,0.02)",
          border: "1px solid rgba(14,165,233,0.05)",
          transform: "perspective(800px) rotateX(6deg) translateY(16px)",
          zIndex: 0,
        }}
      />

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "#131920",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          transform: "perspective(800px) rotateX(2deg)",
          zIndex: 1,
        }}
      >
        <div style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 16px" }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7, display: "block" }} />
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 rounded px-3 py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#44506a" strokeWidth="2">
                <rect x="3" y="11" width="11" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="font-mono text-xs" style={{ color: "#44506a" }}>checkout.example.com</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded px-2 py-1"
              style={{
                background: isAttacking ? "rgba(220,38,38,0.15)" : "rgba(14,165,233,0.1)",
                border: `1px solid ${isAttacking ? "rgba(220,38,38,0.3)" : "rgba(14,165,233,0.2)"}`,
                transition: "all 0.6s ease",
              }}
            >
              <span className="status-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: isAttacking ? "#ef4444" : "#0ea5e9", display: "block", boxShadow: isAttacking ? "0 0 6px rgba(220,38,38,0.8)" : "0 0 6px rgba(14,165,233,0.8)" }} />
              <span className="font-mono" style={{ fontSize: 10, color: isAttacking ? "#ef4444" : "#0ea5e9" }}>
                {isAttacking ? "ATTACKING" : "WATCHING"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative p-6" style={{ minHeight: 280 }}>
          <div className="mb-5">
            <div style={{ height: 10, width: "40%", background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 7, width: "65%", background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 5 }} />
            <div style={{ height: 7, width: "50%", background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: "Email", val: "user@email.com", sensitive: false },
              { label: "Password", val: "••••••••••", sensitive: true },
              { label: "Card Number", val: "•••• •••• ••••", sensitive: true },
            ].map((field, i) => (
              <div key={i}>
                <div className="font-mono mb-1" style={{ fontSize: 10, color: "#44506a" }}>{field.label}</div>
                <div
                  className="flex items-center gap-2 rounded px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${field.sensitive && step >= 1 ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.07)"}`,
                    transition: "border-color 0.5s",
                  }}
                >
                  {field.sensitive && step >= 1 && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                  )}
                  <span className="font-mono" style={{ fontSize: 11, color: "#44506a" }}>{field.val}</span>
                </div>
              </div>
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 2 }}>
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#0ea5e9" opacity="0.6" /></marker>
              <marker id="arr-red" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ef4444" opacity="0.8" /></marker>
            </defs>

            {step >= 1 && (
              <>
                <path id="p1" d="M 200 115 C 280 115 300 180 380 200" stroke="#0ea5e9" strokeWidth="1.2" strokeDasharray="4 3" markerEnd="url(#arr)" opacity="0.5">
                  <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
                </path>
                {step >= 2 && <DataParticle pathId="p1" dur={2} delay={0} color="#0ea5e9" r={2.5} />}
              </>
            )}

            {step >= 2 && (
              <path id="p2" d="M 380 200 C 450 200 490 140 530 100" stroke={step >= 3 ? "#ef4444" : "#0ea5e9"} strokeWidth="1.4" strokeDasharray="4 3" markerEnd={step >= 3 ? "url(#arr-red)" : "url(#arr)"} opacity={step >= 3 ? 0.8 : 0.4} style={{ transition: "stroke 0.6s, opacity 0.6s" }}>
                <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
              </path>
            )}

            {step >= 4 && (
              <>
                <circle cx="530" cy="100" r="12" fill="rgba(220,38,38,0.15)" stroke="#ef4444" strokeWidth="1.5">
                  <animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite" />
                </circle>
                <text x="530" y="105" textAnchor="middle" fill="#ef4444" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">✕</text>
              </>
            )}

            {step >= 1 && (
              <g>
                <rect x="350" y="185" width="64" height="26" rx="4" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
                <text x="382" y="202" textAnchor="middle" fill="#0ea5e9" fontSize="9" fontFamily="JetBrains Mono">script.js</text>
              </g>
            )}

            {step >= 2 && (
              <g style={{ animation: "fadeIn 0.5s ease" }}>
                <rect x="160" y="74" width="88" height="22" rx="4" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />
                <text x="204" y="89" textAnchor="middle" fill="#0ea5e9" fontSize="9" fontFamily="JetBrains Mono">UNMASK SEES</text>
              </g>
            )}

            {step >= 4 && (
              <g style={{ animation: "fadeIn 0.5s ease" }}>
                <rect x="490" y="60" width="68" height="22" rx="4" fill="rgba(220,38,38,0.1)" stroke="rgba(220,38,38,0.3)" strokeWidth="1" />
                <text x="524" y="75" textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">BLOCKED</text>
              </g>
            )}
          </svg>

          {isAttacking && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded px-3 py-2" style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", animation: "fadeIn 0.5s ease" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "block", animation: "pulse 1s ease-in-out infinite" }} />
              <span className="font-mono" style={{ fontSize: 10, color: "#ef4444" }}>Exfiltration blocked</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? "#0ea5e9" : "rgba(255,255,255,0.12)", display: "block", transition: "all 0.3s ease" }} />
        ))}
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <GridBg />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.07) 0%, transparent 60%)" }} />
      <div className="absolute left-0 right-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)", animation: "scan 5s linear infinite", zIndex: 0 }} />

      <div className="relative z-10 w-full page-gutter py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div style={{ animation: "fadeUp 0.7s ease" }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-8 font-mono" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)", fontSize: 11, color: "#0ea5e9" }}>
              <span className="status-dot status-dot-blue" />
              Browser Security System
            </div>

            <h1 className="font-bold leading-tight mb-6" style={{ fontSize: "clamp(2.8rem, 6vw, 4.2rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
              The web doesn't need to be trusted.
              <br />
              <span style={{ color: "#0ea5e9" }}>It needs to be watched.</span>
            </h1>

            <p className="mb-10" style={{ fontSize: 17, color: "#8a94a8", lineHeight: 1.75, maxWidth: 480 }}>
              UNMASK watches how sensitive data moves through the browser — tracing fields, scripts, destinations, and decisions before a silent leak becomes a breach.
            </p>

            <div className="flex gap-4 flex-wrap">
              <button className="btn-primary" onClick={onGetStarted} style={{ fontSize: 14 }}>
                Get Started
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button className="btn-ghost" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} style={{ fontSize: 14 }}>
                See How It Works
              </button>
            </div>

            <div className="mt-12 flex items-center gap-0 font-mono" style={{ fontSize: 12 }}>
              {[
                { label: "FIELD", color: "#0ea5e9" },
                null,
                { label: "SCRIPT", color: "#8b5cf6" },
                null,
                { label: "DESTINATION", color: "#f59e0b" },
                null,
                { label: "DECISION", color: "#22c55e" },
              ].map((item, i) =>
                item === null ? (
                  <svg key={i} width="32" height="12" viewBox="0 0 32 12" fill="none">
                    <path d="M2 6 L26 6" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                    <path d="M22 3 L28 6 L22 9" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                  </svg>
                ) : (
                  <span key={i} className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: item.color }}>
                    {item.label}
                  </span>
                )
              )}
            </div>
          </div>

          <div style={{ animation: "fadeUp 0.9s ease" }}>
            <HeroBrowserViz />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Scroll Story ──────────────────────────────────────────────────────────────

function ScrollStory() {
  const [activeStep, setActiveStep] = useState(0);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = parseInt(e.target.getAttribute("data-step") || "0");
            setActiveStep(idx);
          }
        });
      },
      { threshold: 0.5 }
    );
    stepsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      num: "01", label: "WEB", title: "User visits a website",
      desc: "A website loads. It looks legitimate. The user has visited it before. Nothing seems wrong — yet.",
      color: "#0ea5e9",
      viz: (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl p-6 w-full max-w-xs" style={{ background: "#131920", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", opacity: 0.7 }} />
              <div className="font-mono text-xs" style={{ color: "#44506a" }}>checkout.example.com</div>
              <div className="ml-auto badge badge-unknown">UNKNOWN</div>
            </div>
            <div className="space-y-2">
              {[70, 50, 80, 40].map((w, i) => (
                <div key={i} style={{ height: 8, width: `${w}%`, background: "rgba(255,255,255,0.05)", borderRadius: 3 }} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      num: "02", label: "DATA MOVES", title: "Sensitive information is entered",
      desc: "The user types a password. Fills a card number. Submits a form. Sensitive data now exists in the browser's memory.",
      color: "#0ea5e9",
      viz: (
        <div className="flex flex-col items-center gap-3">
          {["Password", "Card Number"].map((label, i) => (
            <div key={i} className="w-full max-w-xs rounded-lg p-4" style={{ background: "#131920", border: "1px solid rgba(14,165,233,0.25)" }}>
              <div className="font-mono text-xs mb-2" style={{ color: "#44506a" }}>{label}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(14,165,233,0.2)" }}>
                  <span className="font-mono text-xs" style={{ color: "#0ea5e9" }}>••••••••</span>
                </div>
                <div className="badge badge-observed">OBSERVED</div>
              </div>
            </div>
          ))}
          <svg width="200" height="30" viewBox="0 0 200 30">
            <path id="pulse-path" d="M 0 15 L 200 15" stroke="rgba(14,165,233,0.2)" strokeWidth="1" fill="none" />
            <circle r="4" fill="#0ea5e9" opacity="0.8">
              <animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#pulse-path" /></animateMotion>
            </circle>
          </svg>
        </div>
      ),
    },
    {
      num: "03", label: "UNMASK SEES", title: "UNMASK fingerprints the data locally",
      desc: "UNMASK detects sensitive fields and creates a cryptographic fingerprint — locally, never leaving your browser. The original value is never stored.",
      color: "#0ea5e9",
      viz: (
        <div className="rounded-xl p-5 w-full max-w-sm" style={{ background: "#131920", border: "1px solid rgba(14,165,233,0.2)" }}>
          <div className="flex items-center gap-2 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="font-mono text-xs" style={{ color: "#0ea5e9" }}>Data X-Ray Active</span>
          </div>
          {[
            { label: "Sensitive Field", val: "password", color: "#0ea5e9" },
            { label: "Fingerprint", val: "sha256:a3f••••••", color: "#8b5cf6" },
            { label: "State", val: "OBSERVED", color: "#44506a" },
          ].map((row, i) => (
            <div key={i} className="flex justify-between py-2" style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span className="font-mono text-xs" style={{ color: "#44506a" }}>{row.label}</span>
              <span className="font-mono text-xs" style={{ color: row.color }}>{row.val}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      num: "04", label: "UNMASK UNDERSTANDS", title: "The attack chain becomes visible",
      desc: "UNMASK traces every hop: which field, which script read it, and which destination it was sent to. The full lineage, reconstructed.",
      color: "#8b5cf6",
      viz: (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          {[
            { label: "Password Field", sub: "input[type=password]", color: "#0ea5e9" },
            { label: "analytics.js", sub: "cdn.tracker.io/a.js", color: "#8b5cf6" },
            { label: "evil-collector.net", sub: "POST /collect", color: "#f59e0b" },
          ].map((node, i) => (
            <div key={i} className="flex flex-col items-center w-full gap-2">
              <div className="flex items-center gap-3 w-full rounded-lg px-4 py-3" style={{ background: "#131920", border: `1px solid ${node.color}33` }}>
                <span style={{ color: node.color, fontSize: 8 }}>⬤</span>
                <div>
                  <div className="font-mono text-xs" style={{ color: node.color }}>{node.label}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: "#44506a" }}>{node.sub}</div>
                </div>
              </div>
              {i < 2 && (
                <svg width="16" height="20" viewBox="0 0 16 20">
                  <line x1="8" y1="0" x2="8" y2="14" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <path d="M4 11 L8 17 L12 11" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                </svg>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      num: "05", label: "UNMASK STOPS", title: "Suspicious exfiltration is blocked",
      desc: "UNMASK's Firewall intercepts the suspicious request before it reaches the network. The data never leaves your browser.",
      color: "#ef4444",
      viz: (
        <svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path id="blocked-path" d="M 20 80 L 200 80" stroke="rgba(220,38,38,0.3)" strokeWidth="1.5" strokeDasharray="5 3" />
          <circle r="4" fill="#ef4444">
            <animateMotion dur="2s" repeatCount="indefinite" keyTimes="0;0.6;1" keyPoints="0;0.6;0.6" calcMode="linear"><mpath href="#blocked-path" /></animateMotion>
          </circle>
          <circle cx="20" cy="80" r="8" fill="rgba(14,165,233,0.1)" stroke="#0ea5e9" strokeWidth="1.5" />
          <circle cx="20" cy="80" r="3" fill="#0ea5e9" />
          <rect x="165" y="56" width="4" height="48" rx="2" fill="rgba(220,38,38,0.8)" />
          <rect x="150" y="100" width="64" height="22" rx="4" fill="rgba(220,38,38,0.1)" stroke="rgba(220,38,38,0.3)" strokeWidth="1" />
          <text x="182" y="115" textAnchor="middle" fill="#ef4444" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">BLOCKED</text>
          <circle cx="230" cy="80" r="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 2" />
          <text x="230" y="85" textAnchor="middle" fill="#44506a" fontSize="10" fontFamily="JetBrains Mono">✗</text>
          <text x="20" y="102" textAnchor="middle" fill="#44506a" fontSize="9" fontFamily="JetBrains Mono">FIELD</text>
          <text x="230" y="102" textAnchor="middle" fill="#44506a" fontSize="9" fontFamily="JetBrains Mono">DEST</text>
        </svg>
      ),
    },
    {
      num: "06", label: "INCIDENT", title: "The attack is preserved as evidence",
      desc: "Every event, every hop, every decision is recorded. The full attack chain becomes a forensic incident you can investigate and replay.",
      color: "#22c55e",
      viz: (
        <div className="rounded-xl p-5 w-full max-w-sm" style={{ background: "#131920", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="badge badge-critical">CRITICAL</div>
            <span className="font-mono text-xs" style={{ color: "#44506a" }}>just now</span>
          </div>
          <div className="mb-2" style={{ color: "#e8e2d8", fontWeight: 600, fontSize: 14 }}>Sensitive data exfiltration blocked</div>
          <div className="font-mono text-xs mb-4" style={{ color: "#44506a" }}>checkout.example.com → evil-collector.net</div>
          <div className="flex gap-2">
            <div className="badge badge-blocked">BLOCKED</div>
            <div className="badge badge-observed">INCIDENT CAPTURED</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24" style={{ background: "#0b0d11" }}>
      <div className="page-gutter">
        <div className="text-center mb-20">
          <div className="font-mono text-xs mb-3" style={{ color: "#0ea5e9", letterSpacing: "0.1em" }}>// VISIBILITY → LINEAGE → DECISION → CONTROL</div>
          <h2 className="font-bold" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
            How UNMASK works
          </h2>
        </div>

        <div className="space-y-32">
          {steps.map((step, i) => (
            <div
              key={i}
              ref={(el) => { stepsRef.current[i] = el; }}
              data-step={i}
              className={`grid lg:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
              style={{ opacity: activeStep === i ? 1 : 0.4, transition: "opacity 0.5s ease" }}
            >
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="font-mono text-xs mb-3" style={{ color: step.color, letterSpacing: "0.1em" }}>
                  STEP {step.num} — {step.label}
                </div>
                <h3 className="font-bold mb-4" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
                  {step.title}
                </h3>
                <p style={{ color: "#8a94a8", lineHeight: 1.8, fontSize: 15 }}>{step.desc}</p>
              </div>
              <div className={`flex justify-center ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                {step.viz}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Three Layers ──────────────────────────────────────────────────────────────

function ThreeLayers() {
  const layers = [
    {
      num: "01", title: "Trust Gate",
      desc: "Unknown sites begin untrusted. Sensitive inputs are protected until the user explicitly releases them. No data moves without awareness.",
      color: "#f59e0b",
      viz: (
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none">
          <rect x="30" y="20" width="140" height="80" rx="6" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="50" y="40" width="100" height="24" rx="4" fill="rgba(217,119,6,0.08)" stroke="rgba(217,119,6,0.25)" strokeWidth="1" />
          <text x="100" y="57" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="JetBrains Mono">PROTECTED</text>
          <path d="M 10 60 L 30 60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arr2)" />
          <path d="M 170 60 L 190 60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 2" />
          <defs>
            <marker id="arr2" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5 z" fill="rgba(255,255,255,0.15)" /></marker>
          </defs>
        </svg>
      ),
    },
    {
      num: "02", title: "Data X-Ray",
      desc: "Trace sensitive data from field → script → destination using cryptographic fingerprints. Never plaintext. Full lineage, zero exposure.",
      color: "#0ea5e9",
      viz: (
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none">
          <defs>
            <marker id="arr3" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5 z" fill="#0ea5e9" opacity="0.5" /></marker>
          </defs>
          {[["FIELD", "#0ea5e9", 20], ["SCRIPT", "#8b5cf6", 90], ["DEST", "#f59e0b", 160]].map(([label, color, x], i) => (
            <g key={i}>
              <circle cx={Number(x) + 24} cy="60" r="18" fill="rgba(255,255,255,0.02)" stroke={color as string} strokeWidth="1" opacity="0.6" />
              <text x={Number(x) + 24} y="65" textAnchor="middle" fill={color as string} fontSize="8" fontFamily="JetBrains Mono">{label as string}</text>
              {i < 2 && <path d={`M ${Number(x) + 42} 60 L ${Number(x) + 66} 60`} stroke={color as string} strokeWidth="1" opacity="0.4" markerEnd="url(#arr3)" />}
            </g>
          ))}
          <path id="xray-path" d="M 44 60 L 184 60" stroke="rgba(14,165,233,0.1)" strokeWidth="1" fill="none" />
          <circle r="3" fill="#0ea5e9" opacity="0.7">
            <animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#xray-path" /></animateMotion>
          </circle>
        </svg>
      ),
    },
    {
      num: "03", title: "Firewall",
      desc: "Stop suspicious sensitive-data egress locally. The Firewall intercepts cross-site data movement before the network request executes.",
      color: "#ef4444",
      viz: (
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none">
          <defs>
            <marker id="arr4" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5 z" fill="#ef4444" opacity="0.5" /></marker>
          </defs>
          <circle cx="40" cy="60" r="18" fill="rgba(14,165,233,0.06)" stroke="#0ea5e9" strokeWidth="1" />
          <text x="40" y="65" textAnchor="middle" fill="#0ea5e9" fontSize="8" fontFamily="JetBrains Mono">DATA</text>
          <path d="M 58 60 L 90 60" stroke="rgba(220,38,38,0.5)" strokeWidth="1" markerEnd="url(#arr4)" />
          <rect x="98" y="40" width="4" height="40" rx="2" fill="#ef4444" opacity="0.8" />
          <rect x="82" y="78" width="56" height="20" rx="3" fill="rgba(220,38,38,0.1)" stroke="rgba(220,38,38,0.25)" strokeWidth="1" />
          <text x="110" y="92" textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">BLOCKED</text>
          <circle cx="160" cy="60" r="18" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 2" />
          <text x="160" y="65" textAnchor="middle" fill="#44506a" fontSize="8" fontFamily="JetBrains Mono">DEST</text>
          <path d="M 102 60 L 142 60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-28 overflow-hidden" style={{ background: "#0d0f14" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(14,165,233,0.04) 0%, transparent 60%)" }} />
      <div className="page-gutter">
        <div className="text-center mb-16">
          <div className="font-mono text-xs mb-3" style={{ color: "#0ea5e9", letterSpacing: "0.1em" }}>// ARCHITECTURE</div>
          <h2 className="font-bold" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
            Three layers of protection
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {layers.map((layer, i) => (
            <div key={i} className="card card-hover rounded-2xl p-8" style={{ borderColor: `${layer.color}18` }}>
              <div className="font-mono text-xs mb-5" style={{ color: layer.color }}>LAYER {layer.num}</div>
              <div className="flex justify-center mb-6">{layer.viz}</div>
              <h3 className="font-bold mb-3" style={{ fontSize: 20, color: "#e8e2d8", letterSpacing: "-0.01em" }}>{layer.title}</h3>
              <p style={{ fontSize: 14, color: "#8a94a8", lineHeight: 1.75 }}>{layer.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Attack Visualization ──────────────────────────────────────────────────────

function AttackViz() {
  const [phase, setPhase] = useState(0);
  const phases = [
    { label: "TRUSTED", color: "#22c55e", desc: "The website appears legitimate. User has visited before." },
    { label: "BEHAVIOR CHANGES", color: "#f59e0b", desc: "A third-party script silently updates its behavior." },
    { label: "DATA ACCESSED", color: "#f59e0b", desc: "The script reads from a sensitive input field." },
    { label: "EXFILTRATION ATTEMPT", color: "#ef4444", desc: "The script attempts to POST the data cross-site." },
    { label: "BLOCKED", color: "#ef4444", desc: "UNMASK Firewall intercepts the request." },
    { label: "INCIDENT", color: "#0ea5e9", desc: "The full attack chain is preserved as forensic evidence." },
  ];

  return (
    <section className="relative py-28" style={{ background: "#0b0d11" }}>
      <div className="page-gutter">
        <div className="text-center mb-16">
          <div className="font-mono text-xs mb-3" style={{ color: "#0ea5e9", letterSpacing: "0.1em" }}>// DELAYED COMPROMISE</div>
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
            Attacks happen after trust is granted
          </h2>
          <p style={{ color: "#8a94a8", maxWidth: 520, margin: "0 auto", lineHeight: 1.75 }}>
            A website can appear safe for hours — then change. UNMASK watches continuously, not just at first load.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-2">
            {phases.map((p, i) => (
              <button
                key={i}
                onClick={() => setPhase(i)}
                className="w-full text-left rounded-xl px-5 py-4 transition-all duration-200"
                style={{ background: phase === i ? `${p.color}0f` : "transparent", border: `1px solid ${phase === i ? p.color + "33" : "rgba(255,255,255,0.05)"}` }}
              >
                <div className="flex items-center gap-3">
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= phase ? `${p.color}22` : "rgba(255,255,255,0.04)", border: `1.5px solid ${i <= phase ? p.color : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i < phase && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
                    {i === phase && <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "block" }} />}
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold" style={{ color: i <= phase ? p.color : "#44506a", letterSpacing: "0.06em" }}>{p.label}</div>
                    {phase === i && <div style={{ fontSize: 13, color: "#8a94a8", marginTop: 2 }}>{p.desc}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="card rounded-2xl p-6" style={{ minHeight: 380 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="font-mono text-xs" style={{ color: "#44506a" }}>Live view — checkout.example.com</div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs" style={{ background: `${phases[phase].color}12`, border: `1px solid ${phases[phase].color}33`, color: phases[phase].color, transition: "all 0.4s ease" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: phases[phase].color, display: "block" }} />
                {phases[phase].label}
              </div>
            </div>

            <svg width="100%" height="240" viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              {[
                { x: 60, y: 120, sub: "WEBSITE", color: phase >= 1 && phase <= 2 ? "#f59e0b" : phase >= 3 ? "#ef4444" : "#22c55e" },
                { x: 200, y: 60, sub: "SCRIPT", color: phase >= 2 ? (phase >= 3 ? "#ef4444" : "#f59e0b") : "#44506a" },
                { x: 200, y: 180, sub: "SCRIPT", color: "#0ea5e9" },
                { x: 360, y: 60, sub: "EXTERNAL", color: phase >= 3 ? "#ef4444" : "#44506a" },
                { x: 360, y: 180, sub: "TRUSTED", color: "#22c55e" },
              ].map((node, i) => (
                <g key={i}>
                  <circle cx={node.x} cy={node.y} r={i === 0 ? 30 : 22} fill={`${node.color}08`} stroke={node.color} strokeWidth={i === 0 ? 1.5 : 1} opacity={node.color === "#44506a" ? 0.4 : 0.8} style={{ transition: "all 0.5s ease" }} />
                  <text x={node.x} y={node.y - 4} textAnchor="middle" fill={node.color} fontSize={i === 0 ? 8 : 7} fontFamily="JetBrains Mono" opacity={node.color === "#44506a" ? 0.4 : 0.9} style={{ transition: "fill 0.5s ease" }}>{node.sub}</text>
                </g>
              ))}

              <path d="M 88 105 L 178 72" stroke={phase >= 1 ? (phase >= 3 ? "#ef4444" : "#f59e0b") : "rgba(255,255,255,0.06)"} strokeWidth="1.2" strokeDasharray={phase >= 3 ? "none" : "4 2"} style={{ transition: "stroke 0.5s ease" }} />
              <path d="M 88 135 L 178 168" stroke={phase >= 0 ? "#0ea5e9" : "rgba(255,255,255,0.06)"} strokeWidth="1.2" opacity="0.5" />
              <path d="M 222 60 L 338 60" stroke={phase >= 3 ? "#ef4444" : "rgba(255,255,255,0.06)"} strokeWidth="1.5" strokeDasharray={phase >= 5 ? "none" : "4 2"} style={{ transition: "stroke 0.5s ease" }} />
              <path d="M 222 180 L 338 180" stroke="#22c55e" strokeWidth="1.2" opacity="0.4" />

              {phase >= 4 && (
                <>
                  <rect x="285" y="42" width="4" height="36" rx="2" fill="#ef4444" opacity="0.9" />
                  <text x="287" y="90" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">BLOCKED</text>
                </>
              )}

              {phase >= 3 && phase < 5 && (
                <>
                  <path id="atk-path" d="M 88 105 L 178 72 L 285 60" stroke="none" />
                  <circle r="3.5" fill="#ef4444">
                    <animateMotion dur="1.5s" repeatCount="indefinite" keyTimes="0;0.7;1" keyPoints="0;0.7;0.7" calcMode="linear"><mpath href="#atk-path" /></animateMotion>
                  </circle>
                </>
              )}
            </svg>

            <div className="flex justify-between mt-2">
              <button className="btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setPhase(Math.max(0, phase - 1))} disabled={phase === 0}>← Prev</button>
              <button className="btn-primary" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setPhase(Math.min(phases.length - 1, phase + 1))} disabled={phase === phases.length - 1}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Privacy Section ───────────────────────────────────────────────────────────

function Privacy() {
  return (
    <section className="relative py-28" style={{ background: "#0d0f14" }}>
      <div className="page-gutter">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="font-mono text-xs mb-4" style={{ color: "#22c55e", letterSpacing: "0.1em" }}>// LOCAL-FIRST PRIVACY</div>
            <h2 className="font-bold mb-6" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", color: "#e8e2d8", letterSpacing: "-0.02em" }}>
              Security without collecting your secrets.
            </h2>
            <p className="mb-8" style={{ color: "#8a94a8", lineHeight: 1.8, fontSize: 15 }}>
              UNMASK never transmits sensitive values to any server. All fingerprinting happens locally in the browser. Only metadata and incident records leave your device — never the original data.
            </p>
            <div className="space-y-3">
              {[
                { label: "Sensitive field value", sent: false },
                { label: "Cryptographic fingerprint", sent: true },
                { label: "Script origin metadata", sent: true },
                { label: "Destination hostname", sent: true },
                { label: "Firewall decision", sent: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <span style={{ color: item.sent ? "#22c55e" : "#ef4444", fontSize: 8 }}>◆</span>
                    <span className="font-mono text-xs" style={{ color: "#c8bfb0" }}>{item.label}</span>
                  </div>
                  <span className={`badge ${item.sent ? "badge-verified" : "badge-blocked"}`}>{item.sent ? "LOCAL ONLY" : "NEVER SENT"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <svg width="320" height="300" viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="arrPriv" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#22c55e" opacity="0.5" /></marker>
              </defs>
              <rect x="20" y="20" width="200" height="260" rx="12" fill="rgba(22,163,74,0.03)" stroke="rgba(22,163,74,0.2)" strokeWidth="1" strokeDasharray="6 3" />
              <text x="120" y="14" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="JetBrains Mono">YOUR BROWSER</text>

              <rect x="50" y="50" width="140" height="36" rx="6" fill="rgba(14,165,233,0.06)" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />
              <text x="120" y="73" textAnchor="middle" fill="#0ea5e9" fontSize="10" fontFamily="JetBrains Mono">Sensitive Field</text>

              <path d="M 120 86 L 120 114" stroke="rgba(255,255,255,0.15)" strokeWidth="1" markerEnd="url(#arrPriv)" />

              <rect x="50" y="118" width="140" height="36" rx="6" fill="rgba(22,163,74,0.06)" stroke="rgba(22,163,74,0.2)" strokeWidth="1" />
              <text x="120" y="141" textAnchor="middle" fill="#22c55e" fontSize="10" fontFamily="JetBrains Mono">Local Fingerprint</text>

              <path d="M 120 154 L 120 182" stroke="rgba(255,255,255,0.15)" strokeWidth="1" markerEnd="url(#arrPriv)" />

              <rect x="50" y="186" width="140" height="36" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x="120" y="209" textAnchor="middle" fill="#c8bfb0" fontSize="10" fontFamily="JetBrains Mono">Metadata Only</text>

              <path d="M 190 204 L 245 204" stroke="rgba(22,163,74,0.5)" strokeWidth="1.2" markerEnd="url(#arrPriv)" />

              <path d="M 120 86 C 120 40 280 40 280 130" stroke="rgba(220,38,38,0.2)" strokeWidth="1" strokeDasharray="4 2" />
              <line x1="245" y1="80" x2="295" y2="110" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
              <line x1="295" y1="80" x2="245" y2="110" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
              <text x="270" y="78" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">NEVER</text>

              <rect x="240" y="186" width="64" height="36" rx="6" fill="rgba(14,165,233,0.06)" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />
              <text x="272" y="204" textAnchor="middle" fill="#0ea5e9" fontSize="8" fontFamily="JetBrains Mono">UNMASK</text>
              <text x="272" y="216" textAnchor="middle" fill="#0ea5e9" fontSize="8" fontFamily="JetBrains Mono">BACKEND</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA({ onGetStarted, onViewReplay }: { onGetStarted: () => void; onViewReplay: () => void }) {
  return (
    <section className="relative py-40 overflow-hidden" style={{ background: "#0b0d11" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(14,165,233,0.06) 0%, transparent 65%)" }} />
      <GridBg />

      <div className="relative z-10 page-gutter text-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" style={{ opacity: 0.025 }}>
          <span style={{ fontFamily: "Inter", fontWeight: 800, fontSize: "25vw", color: "#0ea5e9", lineHeight: 1, letterSpacing: "-0.04em" }}>UNMASK</span>
        </div>

        <div className="relative z-10">
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#e8e2d8", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Don't just detect the attack.
            <br />
            <span style={{ color: "#0ea5e9" }}>Unmask it.</span>
          </h2>
          <p className="mb-12 mx-auto" style={{ color: "#8a94a8", maxWidth: 480, lineHeight: 1.8, fontSize: 16 }}>
            See what the website tried to do. Trace every hop. Block the leak. Preserve the evidence.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="btn-primary" onClick={onGetStarted} style={{ fontSize: 15, padding: "13px 28px" }}>
              Open UNMASK
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
            <button className="btn-ghost" onClick={onViewReplay} style={{ fontSize: 15, padding: "13px 28px" }}>
              View Incident Replay
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Landing (composed) ────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  const onGetStarted = () => navigate("/console");

  const onViewReplay = async () => {
    try {
      const incidents = await listIncidents();
      if (incidents.length > 0) navigate(`/console/incidents/${incidents[0].id}/replay`);
      else navigate("/console/incidents");
    } catch {
      navigate("/console/incidents");
    }
  };

  return (
    <div style={{ background: "#0b0d11" }}>
      <Hero onGetStarted={onGetStarted} />
      <ScrollStory />
      <ThreeLayers />
      <AttackViz />
      <Privacy />
      <FinalCTA onGetStarted={onGetStarted} onViewReplay={onViewReplay} />
    </div>
  );
}
