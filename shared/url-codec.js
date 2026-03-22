// shared/url-codec.js — URL-as-database codec for Campaign Hype report data
// Schema v1: districtKey lookup (legacy 3 districts)
// Schema v2: geo data embedded (center + bounds) — self-contained, no lookup needed
// Fields: v=version, n=candidateName, s=sent, dv=delivered, f=failed, ts=timestamp
//   v1 only: k=districtKey
//   v2 only: dn=districtName, c=center, b=bounds

export function encodeReport(data) {
  const payload = {
    v:  2,
    n:  data.candidateName,
    dn: data.districtName,
    c:  data.center,
    b:  data.bounds,
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
    const version = Number(p.v ?? 1);

    const result = {
      schemaVersion:    version,
      candidateName:    String(p.n ?? 'Unknown Candidate'),
      sent,
      delivered,
      failed:           Number(p.f ?? 0),
      timestamp:        Number(p.ts ?? Date.now()),
      deliverabilityPct: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
    };

    if (version >= 2) {
      // v2: geo data embedded in URL
      result.districtName = String(p.dn ?? 'Unknown District');
      result.center = p.c;
      result.bounds = p.b;
      result.districtKey = null; // not used in v2
    } else {
      // v1: legacy district key lookup
      result.districtKey = String(p.k ?? '');
      result.districtName = null;
      result.center = null;
      result.bounds = null;
    }

    return result;
  } catch {
    return null;
  }
}
