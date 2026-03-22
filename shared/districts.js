// shared/districts.js — District registry and geo-to-district conversion
// Legacy hardcoded districts kept for v1 URL backward compatibility.
// New v2 districts use buildDistrictFromGeo() to construct a full district object from center + bounds.

// --- Legacy districts (v1 URLs) ---

export const DISTRICTS = {
  'raleigh-nc': {
    displayName: 'Raleigh, NC — Wake County',
    name: 'Raleigh, NC — Wake County',
    center: [-78.6382, 35.7796],
    bounds: [[-78.95, 35.55], [-78.30, 36.05]],
    flyToZoom: 11,
    pitch: 45,
    bearing: -15,
    totalVoters: 18000,
    clusters: [
      { center: [-78.6382, 35.7796], weight: 0.25, spread: 0.04 },
      { center: [-78.7811, 35.7915], weight: 0.18, spread: 0.035 },
      { center: [-78.5400, 35.8700], weight: 0.12, spread: 0.03 },
      { center: [-78.6500, 35.6800], weight: 0.10, spread: 0.03 },
      { center: [-78.7200, 35.8600], weight: 0.10, spread: 0.025 },
      { center: [-78.8300, 35.7300], weight: 0.08, spread: 0.03 },
      { center: [-78.5700, 35.7400], weight: 0.07, spread: 0.02 },
      { center: [-78.4800, 35.8200], weight: 0.05, spread: 0.02 },
      { center: [-78.7000, 35.7200], weight: 0.05, spread: 0.015 },
    ],
  },
  'el-paso-tx': {
    displayName: 'El Paso, TX — TX District 16',
    name: 'El Paso, TX — TX District 16',
    center: [-106.4248, 31.7619],
    bounds: [[-106.65, 31.60], [-106.20, 31.95]],
    flyToZoom: 11,
    pitch: 40,
    bearing: 10,
    totalVoters: 16000,
    clusters: [
      { center: [-106.4248, 31.7619], weight: 0.22, spread: 0.035 },
      { center: [-106.3800, 31.8300], weight: 0.15, spread: 0.03 },
      { center: [-106.5300, 31.7800], weight: 0.13, spread: 0.03 },
      { center: [-106.3400, 31.6900], weight: 0.12, spread: 0.025 },
      { center: [-106.4000, 31.7000], weight: 0.10, spread: 0.02 },
      { center: [-106.5800, 31.8400], weight: 0.08, spread: 0.025 },
      { center: [-106.3200, 31.7800], weight: 0.08, spread: 0.02 },
      { center: [-106.2800, 31.6500], weight: 0.07, spread: 0.02 },
      { center: [-106.4600, 31.7200], weight: 0.05, spread: 0.015 },
    ],
  },
  'phoenix-az': {
    displayName: 'Phoenix, AZ — Maricopa County',
    name: 'Phoenix, AZ — Maricopa County',
    center: [-112.0740, 33.4484],
    bounds: [[-112.40, 33.25], [-111.75, 33.70]],
    flyToZoom: 10.5,
    pitch: 45,
    bearing: -10,
    totalVoters: 20000,
    clusters: [
      { center: [-112.0740, 33.4484], weight: 0.20, spread: 0.04 },
      { center: [-111.9400, 33.4150], weight: 0.15, spread: 0.035 },
      { center: [-111.8410, 33.4150], weight: 0.12, spread: 0.03 },
      { center: [-112.0100, 33.5100], weight: 0.10, spread: 0.025 },
      { center: [-112.1800, 33.4500], weight: 0.10, spread: 0.03 },
      { center: [-112.2700, 33.3700], weight: 0.08, spread: 0.025 },
      { center: [-111.9700, 33.3500], weight: 0.08, spread: 0.02 },
      { center: [-112.1100, 33.5600], weight: 0.07, spread: 0.02 },
      { center: [-112.0100, 33.3300], weight: 0.05, spread: 0.015 },
    ],
  },
};

export function getDistrictKeys() {
  return Object.keys(DISTRICTS);
}

export function getDistrict(key) {
  return DISTRICTS[key] || null;
}

// --- v2: Build district object from geo data embedded in URL ---

/**
 * Construct a full district object from center + bounds (from v2 URL payload).
 * Auto-generates clusters spread across the bounding box and computes flyTo params.
 */
export function buildDistrictFromGeo(center, bounds, name) {
  const [sw, ne] = bounds;
  const width = ne[0] - sw[0];
  const height = ne[1] - sw[1];
  const maxSpan = Math.max(width, height);
  const spread = maxSpan * 0.12;

  return {
    displayName: name || 'District',
    name: name || 'District',
    center,
    bounds,
    flyToZoom: computeZoomFromBounds(bounds),
    pitch: 45,
    bearing: -15,
    clusters: [
      { center, weight: 0.22, spread: spread * 1.2 },
      { center: [center[0] - width * 0.25, center[1] + height * 0.2], weight: 0.14, spread },
      { center: [center[0] + width * 0.25, center[1] + height * 0.2], weight: 0.14, spread },
      { center: [center[0] - width * 0.2, center[1] - height * 0.2], weight: 0.12, spread: spread * 0.9 },
      { center: [center[0] + width * 0.2, center[1] - height * 0.15], weight: 0.12, spread: spread * 0.9 },
      { center: [center[0] + width * 0.1, center[1] + height * 0.05], weight: 0.10, spread: spread * 0.8 },
      { center: [center[0] - width * 0.1, center[1] - height * 0.05], weight: 0.10, spread: spread * 0.8 },
      { center: [center[0] - width * 0.3, center[1]], weight: 0.06, spread: spread * 0.7 },
    ],
  };
}

function computeZoomFromBounds(bounds) {
  const [sw, ne] = bounds;
  const lngSpan = Math.abs(ne[0] - sw[0]);
  const latSpan = Math.abs(ne[1] - sw[1]);
  const maxSpan = Math.max(lngSpan, latSpan);
  if (maxSpan > 5) return 6;
  if (maxSpan > 3) return 7;
  if (maxSpan > 2) return 8;
  if (maxSpan > 1) return 9;
  if (maxSpan > 0.5) return 10;
  if (maxSpan > 0.2) return 11;
  if (maxSpan > 0.1) return 12;
  return 13;
}
