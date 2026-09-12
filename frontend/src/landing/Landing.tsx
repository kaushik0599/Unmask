import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";
import GrainCanvas from "./GrainCanvas";
import {
  ScanInstrument,
  FlowInstrument,
  MetersInstrument,
  GaugeInstrument,
} from "./instruments";
import logoUrl from "./assets/logo.png";

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function ArrowSvg() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LandingNav() {
  return (
    <nav className="ul-nav" aria-label="Primary">
      <a className="logo" href="#top" aria-label="UNMASK home">
        <img src={logoUrl} alt="" />
        <span className="sr">UNMASK home</span>
      </a>
      <span className="tag">Website X-Ray · Security Investigation</span>
    </nav>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */

function Hero({
  innerRef,
  onOpenApp,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  onOpenApp: () => void;
}) {
  return (
    <header className="hero" id="top">
      <div className="hero-inner" ref={innerRef}>
        <p className="eyebrow">See What a Website Is Really Doing</p>
        <h1>UNMASK</h1>
        <p className="sub">
          A polished interface is not proof of safety.{" "}
          <b>UNMASK investigates the destination before you commit</b> — and
          shows you why.
        </p>
        <a
          className="cta"
          href="/console"
          onClick={(e) => {
            e.preventDefault();
            onOpenApp();
          }}
        >
          Begin the Investigation
          <ArrowSvg />
        </a>
      </div>
      <div className="hud" aria-hidden="true">
        <div className="hrow">
          <span className="hled" />
          Illustrative telemetry
        </div>
        <div className="hrow">
          <span className="hled" />
          Signal engine <small>idle</small>
        </div>
        <div className="hrow">
          <span className="hled" />
          Evidence buffer <small>ready</small>
        </div>
      </div>
      <span className="hint" aria-hidden="true">
        SCROLL
      </span>
    </header>
  );
}

/* ── Journey title ───────────────────────────────────────────────────────── */

function JourneyTitle() {
  return (
    <div className="jt">
      <p className="eyebrow">The Investigation</p>
      <h2>
        Four stages.
        <br />
        One clear verdict.
      </h2>
      <p>Follow how UNMASK takes a destination apart — signal by signal.</p>
    </div>
  );
}

/* ── Stage section ───────────────────────────────────────────────────────── */

type StageProps = {
  side: "left" | "right";
  num: string;
  kicker: string;
  title: string;
  copy: React.ReactNode;
  instrument: React.ReactNode;
  chain?: React.ReactNode;
  sectionRef: (el: HTMLElement | null) => void;
};

function Stage({
  side,
  num,
  kicker,
  title,
  copy,
  instrument,
  chain,
  sectionRef,
}: StageProps) {
  return (
    <section
      className={`stage ${side}`}
      ref={sectionRef}
      aria-labelledby={`s-${num}`}
    >
      <div className="body">
        <p className="kicker">
          <span className="num">{num}</span>
          {kicker}
        </p>
        <h3 id={`s-${num}`}>{title}</h3>
        <p className="copy">{copy}</p>
        {instrument}
        {chain}
      </div>
      <span className="node" aria-hidden="true">
        <i />
      </span>
    </section>
  );
}

/* ── Finale ──────────────────────────────────────────────────────────────── */

function Finale({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <section className="finale">
      <span className="verdict">
        <i aria-hidden="true" />
        Verdict · Evidence-backed
      </span>
      <h2>Not a guess. An investigation.</h2>
      <p>
        UNMASK gives every destination a verdict a user can understand at a
        glance — genuine, suspicious, or worth a closer review — and the
        evidence to back it.
      </p>
      <a
        className="cta"
        href="/console"
        onClick={(e) => {
          e.preventDefault();
          onOpenApp();
        }}
      >
        Begin the Investigation
        <ArrowSvg />
      </a>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

const STAGES: Array<{
  side: "left" | "right";
  num: string;
  kicker: string;
  title: string;
  copy: React.ReactNode;
  instrument: React.ReactNode;
  chain?: React.ReactNode;
}> = [
  {
    side: "left",
    num: "01",
    kicker: "SURFACE CHECK",
    title: "Look past the polish.",
    copy: (
      <>
        A convincing logo, familiar brand or polished interface is not proof of
        legitimacy.{" "}
        <b>UNMASK examines the destination before the user commits</b>, looking
        for signals that a visual inspection can miss. Domain identity,
        look-alike characteristics, punycode, redirect behaviour and suspicious
        paths are surfaced as concrete evidence of risk. Instead of blindly
        declaring a site &quot;safe&quot; or &quot;unsafe,&quot; UNMASK shows
        the user why a destination deserves caution.
      </>
    ),
    instrument: <ScanInstrument />,
  },
  {
    side: "right",
    num: "02",
    kicker: "BEHAVIOUR CHECK",
    title: "Let the site answer.",
    copy: (
      <>
        A suspicious page does not always reveal itself at first glance.{" "}
        <b>
          UNMASK observes what happens when a user interacts with the
          destination
        </b>
        , watching how sensitive inputs are handled and where browser activity
        attempts to go. A page may appear completely normal while client-side
        JavaScript waits for interaction before accessing or transmitting data.
        Behavioural observation exposes these hidden actions that a static
        page, screenshot or reputation check can easily miss.
      </>
    ),
    instrument: <FlowInstrument />,
  },
  {
    side: "left",
    num: "03",
    kicker: "EVIDENCE LAYER",
    title: "Connect the red flags.",
    copy: (
      <>
        Individual security signals rarely tell the whole story.{" "}
        <b>UNMASK connects them into an evidence chain</b> that shows how an
        incident unfolded. The system correlates these signals locally wherever
        possible, allowing users to understand not just that something is
        suspicious, but what interacted with their data and where that activity
        was attempting to go.        Raw sensitive values remain outside backend
        telemetry.
      </>
    ),
    instrument: <MetersInstrument />,
    chain: (
      <div className="chain" aria-hidden="true">
        <span>Sensitive field</span>
        <span className="arw">→</span>
        <span>Local fingerprint</span>
        <span className="arw">→</span>
        <span>Observing script</span>
        <span className="arw">→</span>
        <span>Outbound destination</span>
        <span className="arw">→</span>
        <span>Security event</span>
      </div>
    ),
  },
  {
    side: "right",
    num: "04",
    kicker: "SECURITY VERDICT",
    title: "Make trust visible.",
    copy: (
      <>
        Security should end with an understandable decision, not an unreadable
        stream of technical logs.{" "}
        <b>
          UNMASK turns the signals and observed behaviour into a clear security
          outcome
        </b>
        , backed by the evidence collected throughout the investigation. When a
        supported sensitive-data exfiltration attempt is detected, the browser
        can block the request before the original fetch executes and record a
        sanitized security event. The result gives the user both a verdict and
        an explanation of what happened.
      </>
    ),
    instrument: <GaugeInstrument />,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const openApp = () => navigate("/console");
  const heroInnerRef = useRef<HTMLDivElement | null>(null);
  const journeyRef = useRef<HTMLElement | null>(null);
  const pathBaseRef = useRef<SVGPathElement | null>(null);
  const pathLitRef = useRef<SVGPathElement | null>(null);
  const pulseRef = useRef<SVGCircleElement | null>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  const sectionRef = (i: number) => (el: HTMLElement | null) => {
    stageRefs.current[i] = el;
  };

  /* Path building, stage lighting, and the scroll driver — ported from the
     reference script. */
  useEffect(() => {
    const journey = journeyRef.current;
    const base = pathBaseRef.current;
    const lit = pathLitRef.current;
    const pulse = pulseRef.current;
    const hero = heroInnerRef.current;
    if (!journey || !base || !lit || !pulse || !hero) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let litLen = 0;
    let mx = 0;
    let my = 0;
    let ticking = false;

    const buildPath = () => {
      const jr = journey.getBoundingClientRect();
      if (!jr.width || !jr.height) return;
      const svg = lit.ownerSVGElement;
      if (!svg) return;
      svg.setAttribute("width", String(Math.round(jr.width)));
      svg.setAttribute("height", String(Math.round(jr.height)));

      const pts = [{ x: jr.width / 2, y: 0 }];
      for (const s of stageRefs.current) {
        const n = s?.querySelector(".node");
        if (!n) continue;
        const nr = n.getBoundingClientRect();
        pts.push({
          x: nr.left - jr.left + nr.width / 2,
          y: nr.top - jr.top + nr.height / 2,
        });
      }
      pts.push({ x: jr.width / 2, y: jr.height });

      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const myMid = (a.y + b.y) / 2;
        d += ` C ${a.x} ${myMid}, ${b.x} ${myMid}, ${b.x} ${b.y}`;
      }
      base.setAttribute("d", d);
      lit.setAttribute("d", d);
      litLen = lit.getTotalLength();
      lit.style.strokeDasharray = String(litLen);
      lit.style.strokeDashoffset = reduced ? "0" : String(litLen);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = window.innerHeight;
        const t = Math.min(window.scrollY / (h * 0.9), 1);
        hero.style.opacity = String(1 - t * 1.15);
        hero.style.transform = reduced
          ? ""
          : `translateY(${t * -70}px) translateZ(${t * -170}px) rotateX(${-my * 1.8 + t * 6}deg) rotateY(${mx * 1.8}deg)`;

        if (litLen) {
          const rect = journey.getBoundingClientRect();
          const total = rect.height - h * 0.5;
          const passed = Math.min(Math.max(h * 0.55 - rect.top, 0), total);
          const p = Math.max(0, Math.min(1, passed / total));
          lit.style.strokeDashoffset = String(litLen * (1 - p));
          const pt = lit.getPointAtLength(litLen * p);
          pulse.setAttribute("cx", String(pt.x));
          pulse.setAttribute("cy", String(pt.y));
          pulse.style.opacity = p > 0.005 && p < 0.995 ? "0.95" : "0";
        }

        if (!reduced) {
          for (const s of stageRefs.current) {
            const body = s?.querySelector<HTMLElement>(".body");
            if (!body || !s) continue;
            const r = s.getBoundingClientRect();
            const k = Math.max(
              -1.2,
              Math.min(1.2, (r.top + r.height / 2 - h / 2) / h),
            );
            const near = 1 - Math.min(Math.abs(k), 1);
            body.style.transform = `perspective(1300px) translateZ(${near * 50 - 32}px) translateY(${k < 0 ? k * 24 : 0}px) rotateX(${k * 4.5}deg)`;
            body.style.filter =
              k > 0.65
                ? `blur(${(k - 0.65) * 7}px) brightness(${1 - (k - 0.65) * 0.9})`
                : "none";
          }
        }
        ticking = false;
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("lit");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.35 },
    );
    for (const s of stageRefs.current) {
      if (s) io.observe(s);
    }

    buildPath();
    const t1 = setTimeout(buildPath, 260);
    const t2 = setTimeout(buildPath, 1200);
    document.fonts?.ready.then(buildPath);
    const ro = new ResizeObserver(buildPath);
    ro.observe(journey);

    if (!reduced) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="ul-root ul">
      <GrainCanvas />
      <div className="env" aria-hidden="true" />

      <LandingNav />

      <Hero innerRef={heroInnerRef} onOpenApp={openApp} />

      <main className="journey" id="journey" ref={journeyRef}>
        <svg className="pathsvg" aria-hidden="true">
          <path className="base" ref={pathBaseRef} fill="none" strokeWidth="2" />
          <path
            className="lit"
            ref={pathLitRef}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle ref={pulseRef} r="4.5" fill="#8BFFB0" opacity="0" />
        </svg>

        <JourneyTitle />

        {STAGES.map((s, i) => (
          <Stage key={s.num} {...s} sectionRef={sectionRef(i)} />
        ))}
      </main>

      <Finale onOpenApp={openApp} />

      <footer>
        <span>UNMASK — WEBSITE X-RAY</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
