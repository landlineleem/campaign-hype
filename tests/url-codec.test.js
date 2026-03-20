import { describe, it, expect } from 'vitest';
import { encodeReport, decodeReport } from '../shared/url-codec.js';

// Minimal window.location.origin mock for encodeReport
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { location: { origin: 'https://example.com', search: '' } };
}

describe('url-codec', () => {
  const sample = {
    candidateName: 'Jane Smith',
    districtKey: 'raleigh-nc',
    sent: 5000,
    delivered: 4250,
    failed: 750,
  };

  it('round-trips encode → decode losslessly', () => {
    const url = encodeReport(sample);
    const search = '?' + url.split('?')[1];
    const result = decodeReport(search);
    expect(result.candidateName).toBe('Jane Smith');
    expect(result.districtKey).toBe('raleigh-nc');
    expect(result.sent).toBe(5000);
    expect(result.delivered).toBe(4250);
    expect(result.failed).toBe(750);
    expect(result.deliverabilityPct).toBe(85);
  });

  it('produces URL-safe Base64 (no +, /, = in ?d= value)', () => {
    const url = encodeReport(sample);
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

  it('stays under 600 chars with max-length inputs', () => {
    const url = encodeReport({
      candidateName: 'Congressman William P. Hutchinson III',
      districtKey: 'north-carolina-senate-district-22',
      sent: 9999999,
      delivered: 8500000,
      failed: 1499999,
    });
    expect(url.length).toBeLessThan(600);
  });
});
