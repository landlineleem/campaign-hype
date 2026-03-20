// shared/url-codec.js — URL-as-database codec for Campaign Hype report data
// Schema v1 — LOCKED. Changes here break both admin and report pages.
// Fields: v=schema version, n=candidateName, k=districtKey, s=sent, dv=delivered, f=failed, ts=timestamp

const SCHEMA_VERSION = 1;

export function encodeReport(data) {
  const payload = {
    v:  SCHEMA_VERSION,
    n:  data.candidateName,
    k:  data.districtKey,
    s:  data.sent,
    dv: data.delivered,
    f:  data.failed,
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(json)
    .replace(/\+/g, '-')      // URL-safe Base64
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const origin = window.location.origin;
  return `${origin}/campaign-hype/report/?d=${b64}`;
}

export function decodeReport(search = window.location.search) {
  const params = new URLSearchParams(search);
  const raw = params.get('d');
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const p = JSON.parse(json);
    const sent = Number(p.s ?? 0);
    const delivered = Number(p.dv ?? 0);
    return {
      schemaVersion:    Number(p.v ?? 1),
      candidateName:    String(p.n ?? 'Unknown Candidate'),
      districtKey:      String(p.k ?? ''),
      sent,
      delivered,
      failed:           Number(p.f ?? 0),
      timestamp:        Number(p.ts ?? Date.now()),
      deliverabilityPct: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
    };
  } catch {
    return null;
  }
}
