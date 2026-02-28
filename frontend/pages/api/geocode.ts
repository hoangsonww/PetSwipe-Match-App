import type { NextApiRequest, NextApiResponse } from "next";

type LatLng = { lat: number; lon: number };
type Ok = LatLng & { source: "nominatim" | "photon"; query: string };
type Err = { message: string };

const HIT_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const MISS_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const FETCH_TIMEOUT_MS = 6000;

type CacheEntry =
  | { kind: "hit"; value: Ok; ts: number }
  | { kind: "miss"; ts: number };

const geocodeCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Ok | null>>();

function normalizeQuery(q: string) {
  return q
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function getFreshCache(q: string): CacheEntry | null {
  const entry = geocodeCache.get(q);
  if (!entry) return null;

  const maxAge = entry.kind === "hit" ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - entry.ts > maxAge) {
    geocodeCache.delete(q);
    return null;
  }

  return entry;
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function geocodeNominatim(
  q: string,
  referer: string,
): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(
    q,
  )}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "PetSwipe/1.0 (support@petswipe.example)",
        Accept: "application/json",
        Referer: referer,
      },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr?.length) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}

async function geocodePhoton(q: string): Promise<LatLng | null> {
  const url = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`;
  try {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>,
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const q = req.query.q;
  if (!q || typeof q !== "string") {
    res.status(400).json({ message: "Missing q param" });
    return;
  }
  const normalizedQ = normalizeQuery(q);
  if (!normalizedQ) {
    res.status(400).json({ message: "Missing q param" });
    return;
  }

  const protocol =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ||
    "https";
  const host = req.headers.host || "petswipe.vercel.app";
  const referer = `${protocol}://${host}`;

  const cached = getFreshCache(normalizedQ);
  if (cached?.kind === "hit") {
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
    );
    res.status(200).json(cached.value);
    return;
  }
  if (cached?.kind === "miss") {
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=43200");
    res.status(404).json({ message: "No result" });
    return;
  }

  let pending = inFlight.get(normalizedQ);
  if (!pending) {
    pending = (async () => {
      const a = await geocodeNominatim(normalizedQ, referer);
      if (a) {
        const value = {
          ...a,
          source: "nominatim" as const,
          query: normalizedQ,
        };
        geocodeCache.set(normalizedQ, { kind: "hit", value, ts: Date.now() });
        return value;
      }

      const b = await geocodePhoton(normalizedQ);
      if (b) {
        const value = { ...b, source: "photon" as const, query: normalizedQ };
        geocodeCache.set(normalizedQ, { kind: "hit", value, ts: Date.now() });
        return value;
      }

      geocodeCache.set(normalizedQ, { kind: "miss", ts: Date.now() });
      return null;
    })().finally(() => {
      inFlight.delete(normalizedQ);
    });

    inFlight.set(normalizedQ, pending);
  }

  const result = await pending;
  if (result) {
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
    );
    res.status(200).json(result);
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=43200");
  res.status(404).json({ message: "No result" });
}
