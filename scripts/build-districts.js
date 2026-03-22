#!/usr/bin/env node
// scripts/build-districts.js — Download Census TIGER/Line shapefiles and generate per-state district JSON
// Usage: node scripts/build-districts.js
// Output: shared/district-data/<STATE>.json for each state

import { open } from 'shapefile';
import { createWriteStream, mkdirSync, existsSync, rmSync, readdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { pipeline } from 'stream/promises';

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'district-data');
const TMP_DIR = join(import.meta.dirname, '..', '.tmp-shapefiles');

// Census cartographic boundary files (500k resolution — simplified, small)
const SOURCES = [
  {
    type: 'congressional',
    label: 'Congressional Districts (118th)',
    url: 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_cd118_500k.zip',
    nameField: (props) => {
      const num = props.CD118FP;
      if (num === '98') return 'At-Large Congressional District';
      return `Congressional District ${parseInt(num, 10)}`;
    },
    stateField: 'STATEFP',
  },
  {
    type: 'state_senate',
    label: 'State Senate Districts',
    url: 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_sldu_500k.zip',
    nameField: (props) => {
      const num = props.SLDUST;
      if (num === 'ZZZ') return null; // placeholder — skip
      return `State Senate District ${num.replace(/^0+/, '')}`;
    },
    stateField: 'STATEFP',
  },
  {
    type: 'state_house',
    label: 'State House Districts',
    url: 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_sldl_500k.zip',
    nameField: (props) => {
      const num = props.SLDLST;
      if (num === 'ZZZ') return null; // placeholder — skip
      return `State House District ${num.replace(/^0+/, '')}`;
    },
    stateField: 'STATEFP',
  },
  {
    type: 'county',
    label: 'Counties',
    url: 'https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_500k.zip',
    nameField: (props) => props.NAME,
    stateField: 'STATEFP',
  },
];

// FIPS to state abbreviation
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

const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida',
  'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana',
  'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire',
  'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota',
  'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin',
  'WY': 'Wyoming', 'AS': 'American Samoa', 'GU': 'Guam', 'MP': 'Northern Mariana Islands',
  'PR': 'Puerto Rico', 'VI': 'U.S. Virgin Islands',
};

// --- Geometry helpers ---

function computeCentroid(geometry) {
  const coords = flattenCoords(geometry);
  if (coords.length === 0) return [0, 0];
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [
    Math.round((sumLng / coords.length) * 10000) / 10000,
    Math.round((sumLat / coords.length) * 10000) / 10000,
  ];
}

function computeBBox(geometry) {
  const coords = flattenCoords(geometry);
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [Math.round(minLng * 10000) / 10000, Math.round(minLat * 10000) / 10000],
    [Math.round(maxLng * 10000) / 10000, Math.round(maxLat * 10000) / 10000],
  ];
}

function flattenCoords(geometry) {
  const coords = [];
  function walk(arr, depth) {
    if (depth === 0) {
      coords.push(arr);
    } else {
      for (const item of arr) walk(item, depth - 1);
    }
  }
  const type = geometry.type;
  if (type === 'Polygon') walk(geometry.coordinates, 2);
  else if (type === 'MultiPolygon') walk(geometry.coordinates, 3);
  else if (type === 'Point') coords.push(geometry.coordinates);
  return coords;
}

// --- Download + extract ---

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function downloadAndExtract(source) {
  const zipName = basename(source.url);
  const zipPath = join(TMP_DIR, zipName);
  const extractDir = join(TMP_DIR, source.type);

  if (!existsSync(extractDir)) {
    console.log(`  Downloading ${source.label}...`);
    await downloadFile(source.url, zipPath);
    mkdirSync(extractDir, { recursive: true });
    execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`);
  } else {
    console.log(`  Using cached ${source.label}`);
  }

  // Find .shp file
  const files = readdirSync(extractDir);
  const shpFile = files.find(f => f.endsWith('.shp'));
  if (!shpFile) throw new Error(`No .shp found in ${extractDir}`);
  return join(extractDir, shpFile);
}

// --- Process shapefile ---

async function processShapefile(shpPath, source) {
  const districts = {}; // keyed by state abbreviation
  const src = await open(shpPath);

  while (true) {
    const result = await src.read();
    if (result.done) break;
    const feature = result.value;
    if (!feature.geometry) continue;

    const props = feature.properties;
    const stateFips = props[source.stateField];
    const stateAbbr = FIPS_TO_STATE[stateFips];
    if (!stateAbbr) continue; // unknown territory

    const name = source.nameField(props);
    if (!name) continue; // skip placeholders

    const center = computeCentroid(feature.geometry);
    const bounds = computeBBox(feature.geometry);

    if (!districts[stateAbbr]) districts[stateAbbr] = [];
    districts[stateAbbr].push({ name, center, bounds });
  }

  // Sort districts within each state
  for (const state of Object.keys(districts)) {
    districts[state].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  return districts;
}

// --- Main ---

async function main() {
  console.log('Building district data from Census TIGER/Line shapefiles...\n');

  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Collect all districts grouped by state
  const allData = {}; // { stateAbbr: { type: [...districts] } }

  for (const source of SOURCES) {
    console.log(`\nProcessing: ${source.label}`);
    const shpPath = await downloadAndExtract(source);
    const byState = await processShapefile(shpPath, source);

    for (const [stateAbbr, districts] of Object.entries(byState)) {
      if (!allData[stateAbbr]) allData[stateAbbr] = {};
      allData[stateAbbr][source.type] = districts;
    }
    console.log(`  → ${Object.values(byState).reduce((s, d) => s + d.length, 0)} districts across ${Object.keys(byState).length} states`);
  }

  // Write per-state JSON files
  console.log('\nWriting per-state JSON files...');
  let totalDistricts = 0;
  let stateCount = 0;

  // Sort states alphabetically
  const sortedStates = Object.keys(allData).sort();

  for (const stateAbbr of sortedStates) {
    const stateData = allData[stateAbbr];
    const stateName = STATE_NAMES[stateAbbr] || stateAbbr;

    const output = {
      state: stateAbbr,
      stateName,
      districts: stateData,
    };

    const filePath = join(OUT_DIR, `${stateAbbr}.json`);
    await writeFile(filePath, JSON.stringify(output));

    const count = Object.values(stateData).reduce((s, d) => s + d.length, 0);
    totalDistricts += count;
    stateCount++;
  }

  // Write index file (list of states with district counts)
  const index = sortedStates.map(abbr => ({
    abbr,
    name: STATE_NAMES[abbr] || abbr,
    types: Object.keys(allData[abbr]),
    count: Object.values(allData[abbr]).reduce((s, d) => s + d.length, 0),
  }));
  await writeFile(join(OUT_DIR, '_index.json'), JSON.stringify(index));

  console.log(`\nDone! ${totalDistricts} districts across ${stateCount} states/territories`);
  console.log(`Output: ${OUT_DIR}/`);

  // Cleanup
  console.log('Cleaning up temp files...');
  rmSync(TMP_DIR, { recursive: true, force: true });
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
