#!/usr/bin/env node
// scripts/build-state-svgs.js — Generate simplified SVG path data for US state outlines
// Uses Census cartographic boundary state shapefile
// Output: public/state-outlines.json

import { open } from 'shapefile';
import { createWriteStream, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { pipeline } from 'stream/promises';

const OUT_FILE = join(import.meta.dirname, '..', 'public', 'state-outlines.json');
const TMP_DIR = join(import.meta.dirname, '..', '.tmp-states');
const SHP_URL = 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_500k.zip';

const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI',
};

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

// Simplify a ring of coordinates by taking every Nth point
function simplifyRing(ring, maxPoints) {
  if (ring.length <= maxPoints) return ring;
  const step = Math.max(1, Math.floor(ring.length / maxPoints));
  const result = [];
  for (let i = 0; i < ring.length; i += step) {
    result.push(ring[i]);
  }
  // Always include last point to close the ring
  if (result[result.length - 1] !== ring[ring.length - 1]) {
    result.push(ring[ring.length - 1]);
  }
  return result;
}

// Convert polygon coords to SVG path, normalized to viewBox 0 0 100 100
function coordsToSvgPath(allRings, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const width = maxLng - minLng || 1;
  const height = maxLat - minLat || 1;

  // Scale to fit in 100x100 viewBox, preserve aspect ratio
  const scale = Math.min(100 / width, 100 / height);
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (100 - height * scale) / 2;

  function tx(lng) { return ((lng - minLng) * scale + offsetX).toFixed(1); }
  function ty(lat) { return (100 - ((lat - minLat) * scale + offsetY)).toFixed(1); } // flip Y

  let path = '';
  for (const ring of allRings) {
    const simplified = simplifyRing(ring, 60); // max 60 points per ring for small icons
    for (let i = 0; i < simplified.length; i++) {
      const [lng, lat] = simplified[i];
      path += (i === 0 ? 'M' : 'L') + tx(lng) + ',' + ty(lat);
    }
    path += 'Z';
  }
  return path;
}

async function main() {
  console.log('Generating state SVG outlines...\n');
  mkdirSync(TMP_DIR, { recursive: true });

  const zipPath = join(TMP_DIR, 'states.zip');
  const extractDir = join(TMP_DIR, 'states');

  if (!existsSync(extractDir)) {
    console.log('Downloading state boundaries...');
    await downloadFile(SHP_URL, zipPath);
    mkdirSync(extractDir, { recursive: true });
    execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`);
  }

  const files = readdirSync(extractDir);
  const shpFile = files.find(f => f.endsWith('.shp'));
  const shpPath = join(extractDir, shpFile);

  const outlines = {};
  const src = await open(shpPath);

  while (true) {
    const result = await src.read();
    if (result.done) break;
    const feature = result.value;
    if (!feature.geometry) continue;

    const fips = feature.properties.STATEFP;
    const abbr = FIPS_TO_STATE[fips];
    if (!abbr) continue;

    // Collect all rings from the geometry
    const allRings = [];
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      allRings.push(...geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        allRings.push(...poly);
      }
    }

    // Compute bbox
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const ring of allRings) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }

    // For multi-polygon states (like Hawaii), only keep the largest rings
    // Sort rings by area (approximate) and keep top ones
    const sortedRings = allRings
      .map(ring => ({ ring, area: Math.abs(polygonArea(ring)) }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 8) // keep up to 8 largest landmasses
      .map(r => r.ring);

    const svgPath = coordsToSvgPath(sortedRings, [minLng, minLat, maxLng, maxLat]);
    outlines[abbr] = svgPath;
  }

  await writeFile(OUT_FILE, JSON.stringify(outlines));
  console.log(`Generated ${Object.keys(outlines).length} state outlines → ${OUT_FILE}`);

  rmSync(TMP_DIR, { recursive: true, force: true });
}

// Approximate polygon area using shoelace formula (for sorting, not accuracy)
function polygonArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return area / 2;
}

main().catch(err => { console.error(err); process.exit(1); });
