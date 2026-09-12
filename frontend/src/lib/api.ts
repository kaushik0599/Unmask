// Thin client for the existing UNMASK backend. No SQLite access, no second
// backend - this only ever talks to the real Express API over HTTP.

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

export type Severity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id: string;
  created_at: string;
  updated_at: string;
  website: string;
  severity: Severity;
  status: string;
  title: string;
  summary: string;
  verdict: string | null;
  event_count?: number;
  events?: UnmaskEvent[];
}

export interface UnmaskEvent {
  event_id: string;
  incident_id: string;
  timestamp: string;
  tab_id: string | number | null;
  website: string;
  field_type: string | null;
  script_origin: string | null;
  event_type: string;
  destination: string | null;
  vector: string | null;
  policy: string | null;
  action: string | null;
  severity: Severity;
  metadata: {
    field_id?: string;
    field_hash?: string;
    field_length?: number;
    correlation_timestamp?: string;
    request_method?: string;
    [key: string]: unknown;
  } | null;
}

export interface Explanation {
  verdict: string;
  confidence: string;
  findings: Array<{
    event_index: number;
    event_id: string;
    statement: string;
  }>;
}

export class ApiError extends Error {
  kind: "network" | "http" | "malformed";
  status?: number;

  constructor(kind: "network" | "http" | "malformed", message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (err) {
    throw new ApiError("network", "Backend unavailable.");
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError("malformed", "Backend returned a malformed response.");
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : `Request failed (${res.status}).`;
    throw new ApiError("http", message, res.status);
  }

  return body as T;
}

export function getHealth() {
  return request<{ status: string; service: string; time: string }>("/health");
}

export function listIncidents() {
  return request<Incident[]>("/incidents");
}

export function getIncident(id: string) {
  return request<Incident>(`/incidents/${encodeURIComponent(id)}`);
}

export function explainIncident(id: string) {
  return request<Explanation>(`/incidents/${encodeURIComponent(id)}/explain`, { method: "POST" });
}
