/**
 * Server-side geocoding with Nominatim + Photon + deterministic fallback.
 * Contract: geocodeAddress() NEVER returns null — it always picks a location.
 */

const FETCH_TIMEOUT_MS = 8_000;

type LatLng = { lat: number; lon: number };

// ── Known US state centroids ────────────────────────────────────────────────
const US_STATE_COORDS: Record<string, LatLng> = {
  AL: { lat: 32.806671, lon: -86.79113 },
  AK: { lat: 61.370716, lon: -152.404419 },
  AZ: { lat: 33.729759, lon: -111.431221 },
  AR: { lat: 34.969704, lon: -92.373123 },
  CA: { lat: 36.116203, lon: -119.681564 },
  CO: { lat: 39.059811, lon: -105.311104 },
  CT: { lat: 41.597782, lon: -72.755371 },
  DE: { lat: 39.318523, lon: -75.507141 },
  FL: { lat: 27.766279, lon: -81.686783 },
  GA: { lat: 33.040619, lon: -83.643074 },
  HI: { lat: 21.094318, lon: -157.498337 },
  ID: { lat: 44.240459, lon: -114.478828 },
  IL: { lat: 40.349457, lon: -88.986137 },
  IN: { lat: 39.849426, lon: -86.258278 },
  IA: { lat: 42.011539, lon: -93.210526 },
  KS: { lat: 38.5266, lon: -96.726486 },
  KY: { lat: 37.66814, lon: -84.670067 },
  LA: { lat: 31.169546, lon: -91.867805 },
  ME: { lat: 44.693947, lon: -69.381927 },
  MD: { lat: 39.063946, lon: -76.802101 },
  MA: { lat: 42.230171, lon: -71.530106 },
  MI: { lat: 43.326618, lon: -84.536095 },
  MN: { lat: 45.694454, lon: -93.900192 },
  MS: { lat: 32.741646, lon: -89.678696 },
  MO: { lat: 38.456085, lon: -92.288368 },
  MT: { lat: 46.921925, lon: -110.454353 },
  NE: { lat: 41.12537, lon: -98.268082 },
  NV: { lat: 38.313515, lon: -117.055374 },
  NH: { lat: 43.452492, lon: -71.563896 },
  NJ: { lat: 40.298904, lon: -74.521011 },
  NM: { lat: 34.840515, lon: -106.248482 },
  NY: { lat: 42.165726, lon: -74.948051 },
  NC: { lat: 35.630066, lon: -79.806419 },
  ND: { lat: 47.528912, lon: -99.784012 },
  OH: { lat: 40.388783, lon: -82.764915 },
  OK: { lat: 35.565342, lon: -96.928917 },
  OR: { lat: 44.572021, lon: -122.070938 },
  PA: { lat: 40.590752, lon: -77.209755 },
  RI: { lat: 41.680893, lon: -71.51178 },
  SC: { lat: 33.856892, lon: -80.945007 },
  SD: { lat: 44.299782, lon: -99.438828 },
  TN: { lat: 35.747845, lon: -86.692345 },
  TX: { lat: 31.054487, lon: -97.563461 },
  UT: { lat: 40.150032, lon: -111.862434 },
  VT: { lat: 44.045876, lon: -72.710686 },
  VA: { lat: 37.769337, lon: -78.169968 },
  WA: { lat: 47.400902, lon: -121.490494 },
  WV: { lat: 38.491226, lon: -80.954453 },
  WI: { lat: 44.268543, lon: -89.616508 },
  WY: { lat: 42.755966, lon: -107.30249 },
  DC: { lat: 38.897438, lon: -77.026817 },
};

// ── Known country centroids ─────────────────────────────────────────────────
const COUNTRY_COORDS: Record<string, LatLng> = {
  usa: { lat: 39.8283, lon: -98.5795 },
  "united states": { lat: 39.8283, lon: -98.5795 },
  "united states of america": { lat: 39.8283, lon: -98.5795 },
  canada: { lat: 56.1304, lon: -106.3468 },
  mexico: { lat: 23.6345, lon: -102.5528 },
  "united kingdom": { lat: 55.3781, lon: -3.436 },
  uk: { lat: 55.3781, lon: -3.436 },
  france: { lat: 46.2276, lon: 2.2137 },
  germany: { lat: 51.1657, lon: 10.4515 },
  spain: { lat: 40.4637, lon: -3.7492 },
  italy: { lat: 41.8719, lon: 12.5674 },
  australia: { lat: -25.2744, lon: 133.7751 },
  japan: { lat: 36.2048, lon: 138.2529 },
  "south korea": { lat: 35.9078, lon: 127.7669 },
  china: { lat: 35.8617, lon: 104.1954 },
  india: { lat: 20.5937, lon: 78.9629 },
  brazil: { lat: -14.235, lon: -51.9253 },
  argentina: { lat: -38.4161, lon: -63.6167 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  philippines: { lat: 12.8797, lon: 121.774 },
  thailand: { lat: 15.87, lon: 100.9925 },
  vietnam: { lat: 14.0583, lon: 108.2772 },
  "south africa": { lat: -30.5595, lon: 22.9375 },
  nigeria: { lat: 9.082, lon: 8.6753 },
  egypt: { lat: 26.8206, lon: 30.8025 },
  uae: { lat: 23.4241, lon: 53.8478 },
  "united arab emirates": { lat: 23.4241, lon: 53.8478 },
  "new zealand": { lat: -40.9006, lon: 174.886 },
  netherlands: { lat: 52.1326, lon: 5.2913 },
  switzerland: { lat: 46.8182, lon: 8.2275 },
  sweden: { lat: 60.1282, lon: 18.6435 },
  norway: { lat: 60.472, lon: 8.4689 },
  poland: { lat: 51.9194, lon: 19.1451 },
  turkey: { lat: 38.9637, lon: 35.2433 },
  russia: { lat: 61.524, lon: 105.3188 },
  kenya: { lat: -0.0236, lon: 37.9062 },
  "saudi arabia": { lat: 23.8859, lon: 45.0792 },
};

// ── Default fallback: geographic center of the contiguous US ─────────────
const DEFAULT_FALLBACK: LatLng = { lat: 39.8283, lon: -98.5795 };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simple FNV-1a hash for deterministic jitter so markers don't stack. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/** Returns a small deterministic offset (±0.05 degrees ≈ ±5 km). */
function jitter(seed: string): { dlat: number; dlon: number } {
  const h = fnv1a(seed);
  const dlat = ((h & 0xffff) / 0xffff) * 0.1 - 0.05;
  const dlon = (((h >>> 16) & 0xffff) / 0xffff) * 0.1 - 0.05;
  return { dlat, dlon };
}

const US_STATES = new Set(Object.keys(US_STATE_COORDS));

function extractStateCode(addr: string): string | undefined {
  const parts = addr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = parts[i].match(/\b([A-Z]{2})\b/);
    if (match && US_STATES.has(match[1])) return match[1];
  }
  return undefined;
}

function extractCountry(addr: string): string | undefined {
  const parts = addr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  const tail = parts[parts.length - 1].toLowerCase();
  if (COUNTRY_COORDS[tail]) return tail;
  // Check second-to-last if last is a state code
  if (parts.length >= 2) {
    const prev = parts[parts.length - 2].toLowerCase().trim();
    if (COUNTRY_COORDS[prev]) return prev;
  }
  return undefined;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ── External geocoding providers ────────────────────────────────────────────

async function geocodeNominatim(q: string): Promise<LatLng | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "PetSwipe/1.0 (support@petswipe.example)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr?.length) return null;
    const lat = parseFloat(arr[0].lat);
    const lon = parseFloat(arr[0].lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

async function geocodePhoton(q: string): Promise<LatLng | null> {
  try {
    const url = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const feat = json?.features?.[0];
    if (!feat) return null;
    const [lon, lat] = feat.geometry?.coordinates ?? [];
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

// ── Deterministic fallback ──────────────────────────────────────────────────

function fallbackFromAddress(address: string): LatLng {
  const { dlat, dlon } = jitter(address);

  // Try US state match
  const state = extractStateCode(address);
  if (state && US_STATE_COORDS[state]) {
    const c = US_STATE_COORDS[state];
    return { lat: c.lat + dlat, lon: c.lon + dlon };
  }

  // Try country match
  const country = extractCountry(address);
  if (country && COUNTRY_COORDS[country]) {
    const c = COUNTRY_COORDS[country];
    return { lat: c.lat + dlat, lon: c.lon + dlon };
  }

  // Absolute fallback — US center with jitter
  return { lat: DEFAULT_FALLBACK.lat + dlat, lon: DEFAULT_FALLBACK.lon + dlon };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Geocode an address. Tries Nominatim, then Photon, then deterministic fallback.
 * NEVER returns null.
 */
export async function geocodeAddress(
  address: string | undefined | null,
): Promise<LatLng> {
  if (!address || !address.trim()) {
    return fallbackFromAddress("");
  }

  const q = address.replace(/\s+/g, " ").trim();

  // Try Nominatim
  const a = await geocodeNominatim(q);
  if (a) return a;

  // Try Photon
  const b = await geocodePhoton(q);
  if (b) return b;

  // Try with simplified query (city + state/country only)
  const parts = q
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 2) {
    const simplified = parts.slice(-2).join(", ");
    const c = await geocodeNominatim(simplified);
    if (c) return c;
    const d = await geocodePhoton(simplified);
    if (d) return d;
  }

  // Deterministic fallback — never fails
  return fallbackFromAddress(q);
}

/**
 * Geocode multiple addresses with concurrency control.
 * Returns results in the same order as input.
 */
export async function geocodeBatch(
  items: Array<{ id: string; address: string | undefined | null }>,
  concurrency = 4,
): Promise<Map<string, LatLng>> {
  const results = new Map<string, LatLng>();
  let idx = 0;

  const run = async () => {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      const coords = await geocodeAddress(item.address);
      results.set(item.id, coords);
      // Small delay between requests to respect rate limits
      if (idx < items.length) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(run());
  }
  await Promise.allSettled(workers);

  return results;
}
