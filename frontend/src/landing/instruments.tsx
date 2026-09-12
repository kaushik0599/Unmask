import { useEffect, useRef } from "react";

/* ── Instrument card chrome (shared) ─────────────────────────────────────── */

function Instrument({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="instr" aria-hidden="true">
      <div className="ihead">
        <span className="ilabel">
          <span className="live" />
          {label}
        </span>
        <span className="ichip">Illustrative</span>
      </div>
      {children}
    </div>
  );
}

/* ── Stage 01 — scan readout ─────────────────────────────────────────────── */

export function ScanInstrument() {
  return (
    <Instrument label="Analysis · Surface scan">
      <div className="scan">
        <div className="rows">
          <span className="r" />
          <span className="r" />
          <span className="r" />
        </div>
        <div className="beam" />
        <div className="tags">
          <b>DOMAIN</b>
          <b>PUNYCODE</b>
          <b>REDIRECT</b>
        </div>
      </div>
    </Instrument>
  );
}

/* ── Stage 02 — dataflow ─────────────────────────────────────────────────── */

export function FlowInstrument() {
  return (
    <Instrument label="Data flow · Observed activity">
      <div className="flow">
        <span className="np">Sensitive field</span>
        <span className="wire" />
        <span className="np">Client script</span>
        <span className="wire w2" />
        <span className="np">Outbound</span>
      </div>
    </Instrument>
  );
}

/* ── Stage 03 — correlation meters ───────────────────────────────────────── */

const SPARKS_PER_METER = 5;

function animateMeters(scope: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const values = scope.querySelectorAll<HTMLElement>(".mv");
  const sparks = scope.querySelectorAll<HTMLElement>(".spark");

  if (reduced) {
    values.forEach((el) => {
      el.textContent = el.dataset.count ?? "0";
    });
    sparks.forEach((sp) => {
      sp.querySelectorAll("i").forEach((i) => {
        i.style.height = `${30 + Math.random() * 70}%`;
      });
    });
    return;
  }

  values.forEach((el, idx) => {
    const target = Number(el.dataset.count ?? 0);
    let v = 0;
    setTimeout(() => {
      const step = () => {
        v += 1;
        el.textContent = String(v);
        if (v < target) setTimeout(step, 160);
      };
      step();
    }, idx * 220);
  });

  sparks.forEach((sp, si) => {
    sp.querySelectorAll("i").forEach((bar, bi) => {
      setTimeout(() => {
        bar.style.height = `${28 + Math.random() * 66}%`;
      }, si * 200 + bi * 70);
    });
  });
}

export function MetersInstrument() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            animateMeters(el);
            io.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Instrument label="Security signal · Correlation">
      <div className="meters" ref={ref}>
        {[
          { count: 5, key: "Signals" },
          { count: 3, key: "Correlated" },
          { count: 1, key: "Event" },
        ].map((m) => (
          <div className="meter" key={m.key}>
            <div className="mv" data-count={m.count}>
              0
            </div>
            <div className="mk">{m.key}</div>
            <div className="spark">
              {Array.from({ length: SPARKS_PER_METER }).map((_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Instrument>
  );
}

/* ── Stage 04 — verdict gauge ────────────────────────────────────────────── */

export function GaugeInstrument() {
  return (
    <Instrument label="Verdict · Evidence confidence">
      <div
        className="gauge"
        style={{ ["--circ" as string]: "188.5", ["--goff" as string]: "41.5" }}
      >
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle
            cx="38"
            cy="38"
            r="30"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="4"
          />
          <circle
            className="gring"
            cx="38"
            cy="38"
            r="30"
            fill="none"
            strokeWidth="4"
            transform="rotate(-90 38 38)"
          />
          <text className="glabel" x="38" y="43" textAnchor="middle">
            78
          </text>
        </svg>
        <div className="gbody">
          <div className="gv">Worth a closer review</div>
          <div className="gd">
            Verdict assembled from collected evidence — not a real-time claim.
          </div>
        </div>
      </div>
    </Instrument>
  );
}
