import { describe, it, expect } from 'vitest';
import { encodeReport, decodeReport } from '../shared/url-codec.js';

// Minimal window.location.origin mock for encodeReport
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { location: { origin: 'https://example.com', search: '' } };
}

describe('url-codec', () => {
  // v2 sample — geo data embedded
  const sampleV2 = {
    candidateName: 'Jane Smith',
    districtName: 'Wake County, NC',
    center: [-78.6382, 35.7796],
    bounds: [[-78.95, 35.55], [-78.30, 36.05]],
    sent: 5000,
    delivered: 4250,
    failed: 750,
  };

  it('round-trips encode → decode losslessly (v2)', () => {
    const url = encodeReport(sampleV2);
    const search = '?' + url.split('?')[1];
    const result = decodeReport(search);
    expect(result.schemaVersion).toBe(2);
    expect(result.candidateName).toBe('Jane Smith');
    expect(result.districtName).toBe('Wake County, NC');
    expect(result.center).toEqual([-78.6382, 35.7796]);
    expect(result.bounds).toEqual([[-78.95, 35.55], [-78.30, 36.05]]);
    expect(result.sent).toBe(5000);
    expect(result.delivered).toBe(4250);
    expect(result.failed).toBe(750);
    expect(result.deliverabilityPct).toBe(85);
  });

  it('decodes v1 URLs with districtKey (backward compat)', () => {
    // Manually craft a v1 payload
    const v1Payload = JSON.stringify({ v: 1, n: 'Old Link', k: 'raleigh-nc', s: 1000, dv: 900, f: 100, ts: 1 });
    const b64 = btoa(v1Payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = decodeReport(`?d=${b64}`);
    expect(result.schemaVersion).toBe(1);
    expect(result.districtKey).toBe('raleigh-nc');
    expect(result.center).toBeNull();
    expect(result.bounds).toBeNull();
  });

  it('produces URL-safe Base64 (no +, /, = in ?d= value)', () => {
    const url = encodeReport(sampleV2);
    const d = url.split('?d=')[1];
    expect(d).not.toMatch(/[+/=]/);
  });

  it('returns null for empty search string', () => {
    expect(decodeReport('')).toBeNull();
  });

  it('returns null when ?d= param is absent', () => {
    expect(decodeReport('?x=nothing')).toBeNull();
  });

  it('returns null for corrupt base64 payload (no throw)', () => {
    expect(decodeReport('?d=!!!notbase64!!!')).toBeNull();
  });

  it('stays under 800 chars with max-length inputs and geo data', () => {
    const url = encodeReport({
      candidateName: 'Congressman William P. Hutchinson III',
      districtName: 'North Carolina State Senate District 22, NC',
      center: [-78.6382, 35.7796],
      bounds: [[-79.1234, 35.1234], [-78.1234, 36.1234]],
      sent: 9999999,
      delivered: 8500000,
      failed: 1499999,
    });
    expect(url.length).toBeLessThan(800);
  });
});
