// report/map.js — MapLibre GL JS setup for Campaign Hype report page
// Ported from voterping-viz/src/map.js with WebGL context-loss handling added.
// Pitfall addressed: WebGL context loss on iOS Safari (pitfall research #2).
import { Map } from 'maplibre-gl';

// CartoCDN dark tile style — inline object, no external JSON file to fetch.
// Free, no API key required. Proven in voterping-viz.
const MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/**
 * Create and return a MapLibre map initialized to USA overview.
 *
 * @param {string} containerId - DOM element ID for the map canvas. Default: 'map-container'.
 * @returns {Map}              - MapLibre Map instance (not yet loaded — await 'load' event).
 */
export function createMap(containerId = 'map-container') {
  const map = new Map({
    container: containerId,
    style: MAP_STYLE,
    center: [-98.5795, 39.8283],  // Geographic center of the contiguous USA
    zoom: 4,
    pitch: 0,
    bearing: 0,
    maxPitch: 60,
    antialias: true,
    // CRITICAL: keep preserveDrawingBuffer false (default).
    // Setting it to true doubles GPU memory usage and dramatically increases
    // WebGL context loss frequency on iOS Safari (pitfall research #2).
    preserveDrawingBuffer: false,
  });

  // WebGL context-loss recovery (pitfall research #2 — iOS Safari kills context on background)
  // The canvas element is available immediately after Map construction.
  const canvas = map.getCanvas();

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // Prevent browser default (which gives up entirely)
    const recovery = document.getElementById('webgl-recovery');
    if (recovery) recovery.style.display = 'flex';
  });

  canvas.addEventListener('webglcontextrestored', () => {
    // MapLibre may auto-recover — hide the prompt if it does
    const recovery = document.getElementById('webgl-recovery');
    if (recovery) recovery.style.display = 'none';
  });

  // Reload button wires to full page reload (simplest reliable recovery)
  const reloadBtn = document.getElementById('reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => window.location.reload());
  }

  // Generic map error handler — catch style load failures, network errors
  map.on('error', (e) => {
    console.error('[map.js] MapLibre error:', e.error);
    // Only show recovery if the map canvas is already broken (context lost)
    // — style errors are often recoverable without user action
  });

  return map;
}

/**
 * Add all voter visualization layers to the map.
 * Must be called inside map.on('load', ...) — layers cannot be added before style loads.
 *
 * Layer stack (bottom to top):
 *   voters-heatmap    — orange/gold heatmap underlay
 *   voters-inactive   — dim grey dots (all points, always visible)
 *   voters-activated  — bright gold dots (revealed progressively by animation filter)
 *   ping-rings-layer  — expanding ring on the latest activated batch
 *
 * @param {Map}    map        - Loaded MapLibre map instance
 * @param {object} geojsonData - GeoJSON FeatureCollection from report/data.js
 */
export function addVoterLayers(map, geojsonData) {
  // Main voter data source
  map.addSource('voters', {
    type: 'geojson',
    data: geojsonData,
  });

  // Heatmap underlay — builds up as points activate (filter matches activated filter)
  map.addLayer({
    id: 'voters-heatmap',
    type: 'heatmap',
    source: 'voters',
    filter: ['<=', ['get', 'order'], -1],  // Start hidden; animation updates this
    paint: {
      'heatmap-weight': 0.5,
      'heatmap-intensity': 0.6,
      'heatmap-radius': 18,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,   'rgba(0, 0, 0, 0)',
        0.3, 'rgba(255, 140, 0, 0.12)',
        0.6, 'rgba(255, 184, 0, 0.25)',
        1,   'rgba(255, 213, 79, 0.4)',
      ],
      'heatmap-opacity': 0.5,
    },
  });

  // All dots dim and visible immediately (shows the full district extent)
  map.addLayer({
    id: 'voters-inactive',
    type: 'circle',
    source: 'voters',
    paint: {
      'circle-radius': 2,
      'circle-color': '#3a3a3a',
      'circle-opacity': 0.3,
    },
  });

  // Activated (delivered) dots — bright gold, revealed progressively by animation
  map.addLayer({
    id: 'voters-activated',
    type: 'circle',
    source: 'voters',
    filter: ['<=', ['get', 'order'], -1],  // Start hidden; animation updates this
    paint: {
      'circle-radius': 3.5,
      'circle-color': '#FFB800',
      'circle-opacity': 0.85,
      'circle-blur': 0.4,
    },
  });

  // Ping ring source — separate small dataset, updated each animation batch
  map.addSource('ping-rings', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'ping-rings-layer',
    type: 'circle',
    source: 'ping-rings',
    paint: {
      'circle-radius': 6,
      'circle-color': 'rgba(255, 213, 79, 0.15)',
      'circle-opacity': 0.7,
      'circle-blur': 0.5,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#FFB800',
      'circle-stroke-opacity': 0.5,
    },
  });
}

/**
 * Remove voter layers and sources from the map.
 * Used if the map needs to reinitialize for a replay.
 *
 * @param {Map} map - MapLibre map instance
 */
export function removeVoterLayers(map) {
  const layers = ['ping-rings-layer', 'voters-activated', 'voters-inactive', 'voters-heatmap'];
  const sources = ['ping-rings', 'voters'];
  for (const id of layers) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of sources) {
    if (map.getSource(id)) map.removeSource(id);
  }
}
