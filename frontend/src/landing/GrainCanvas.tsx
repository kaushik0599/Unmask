import { useEffect, useRef } from "react";

/** Fixed, full-viewport canvas of slow-drifting green particles (reference `#grain`). */
export default function GrainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let raf = 0;
    type P = { x: number; y: number; r: number; s: number; a: number };
    let pts: P[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = cv.width = window.innerWidth * dpr;
      H = cv.height = window.innerHeight * dpr;
      cv.style.width = `${window.innerWidth}px`;
      cv.style.height = `${window.innerHeight}px`;
      pts = Array.from({ length: Math.min(70, window.innerWidth / 15) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (Math.random() * 1.3 + 0.4) * dpr,
        s: Math.random() * 0.15 + 0.04,
        a: Math.random() * 0.4 + 0.08,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.y -= p.s * (window.devicePixelRatio || 1);
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,255,110,${p.a * 0.5})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    if (!reduced) {
      resize();
      draw();
      window.addEventListener("resize", resize);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      };
    }
  }, []);

  return <canvas ref={ref} id="grain" aria-hidden="true" />;
}
