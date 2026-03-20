// report/data.js — Synthetic voter coordinate generator for Campaign Hype
// Ported from voterping-viz/src/data.js with count-capping for mobile performance.
// Pure module: no DOM, no window — safe to import in tests.

/**
 * Box-Muller transform: Gaussian-distributed random from uniform Math.random().
 * Produces natural-looking geographic scatter around cluster centers.
 */
function gaussianRandom(mean, stdev) {
  const u1 = 1 - Math.random(); // avoid log(0)
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * stdev + mean;
}

/**
 * Sort points by radial angle around center — produces the wave-spreading visual
 * effect as the animation filter steps through 'order' values.
 */
function sortRadial(points, center) {
  points.sort((a, b) => {
    const angleA = Math.atan2(a[1] - center[1], a[0] - center[0]);
    const angleB = Math.atan2(b[1] - center[1], b[0] - center[0]);
    return angleA - angleB;
  });
}

/**
 * Generate synthetic voter coordinate GeoJSON for a district.
 *
 * @param {object} district - District object from shared/districts.js (getDistrict)
 * @param {number} count    - Number of points to generate. Capped at 5000 for mobile perf.
 *                           Pass payload.delivered as the count — each dot = one delivered message.
 * @returns {object}        - GeoJSON FeatureCollection; each feature has { properties: { order: N } }
 *                           where N is the radial sort index used by the animation filter.
 */
export function generateVoterData(district, count) {
  // Cap at 5000 — above this, visual impact plateaus but mobile GPU cost keeps climbing.
  // (pitfall research: "Dot cascade performance: > 50,000 synthetic points on mobile — cap at 5,000–10,000")
  const targetCount = Math.min(count, 5000);
  const { clusters, center } = district;

  // Compute total cluster weight for normalization
  const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);

  const points = [];

  for (const cluster of clusters) {
    // Distribute points proportionally to cluster weight
    const clusterCount = Math.round(targetCount * (cluster.weight / totalWeight));
    for (let i = 0; i < clusterCount; i++) {
      const lng = gaussianRandom(cluster.center[0], cluster.spread);
      const lat = gaussianRandom(cluster.center[1], cluster.spread * 0.75);
      points.push([lng, lat]);
    }
  }

  // Sort radially around district center for wave-spreading animation effect
  sortRadial(points, center);

  // Build GeoJSON FeatureCollection — 'order' is the animation step index
  const features = points.map((coords, index) => ({
    type: 'Feature',
    properties: { order: index },
    geometry: { type: 'Point', coordinates: coords },
  }));

  return { type: 'FeatureCollection', features };
}
