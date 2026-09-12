export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function severityDotColor(severity: string): "red" | "amber" | "blue" | "green" {
  switch (severity) {
    case "critical":
    case "high":
      return "red";
    case "medium":
      return "amber";
    case "low":
      return "blue";
    default:
      return "green";
  }
}

export function shortHash(hash?: string | null): string {
  if (!hash) return "unavailable";
  return `sha256:${hash.slice(0, 10)}…`;
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour12: false });
}
