import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Script from "next/script";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Crosshair,
  RefreshCw,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { petApi, Pet } from "@/lib/api";

type LatLng = { lat: number; lon: number };
type GeocodeHit = LatLng & { queryUsed: string; source: "photon" | "proxy" };
type PointsItem = { pet: Pet; hit: GeocodeHit };

const GLOBAL_QUERY_CACHE_KEY = "petswipe_gc_query_v3";
const GLOBAL_PET_CACHE_KEY = "petswipe_gc_pet_v3";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const DEFAULT_COUNTRY = "USA";
const CONCURRENCY = 48;
const PAGE_SIZE_OPTIONS = [24, 48, 96, 192];

// ---------- cache helpers (with TTL) ----------
function now() {
  return Date.now();
}
function loadCache<T>(k: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(k) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveCache(k: string, v: unknown) {
  try {
    if (typeof window !== "undefined")
      localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
function isFresh(ts?: number) {
  return typeof ts === "number" && now() - ts < CACHE_TTL_MS;
}

// ---------- geocode via Photon (CORS-safe) + optional proxy ----------
async function geocode(
  q: string,
  signal?: AbortSignal,
): Promise<GeocodeHit | null> {
  // Photon (CORS-friendly, fast)
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const json = await res.json();
      const feat = json?.features?.[0];
      const coords = feat?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        return {
          lat: coords[1],
          lon: coords[0],
          queryUsed: q,
          source: "photon",
        };
      }
    }
  } catch {}
  // Optional proxy (if you created /api/geocode)
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.lat === "number" && typeof data?.lon === "number") {
        return {
          lat: data.lat,
          lon: data.lon,
          queryUsed: data.query ?? q,
          source: "proxy",
        };
      }
    }
  } catch {}
  return null;
}

// ---------- address parsing (intl-friendly) ----------
const KNOWN_COUNTRIES = new Set(
  [
    "USA",
    "United States",
    "United States of America",
    "Canada",
    "Mexico",
    "United Kingdom",
    "UK",
    "Great Britain",
    "France",
    "Germany",
    "Spain",
    "Italy",
    "Australia",
    "New Zealand",
    "Brazil",
    "Argentina",
    "Chile",
    "Japan",
    "South Korea",
    "China",
    "India",
    "Singapore",
    "Malaysia",
    "Indonesia",
    "Philippines",
    "Thailand",
    "Vietnam",
    "Viet Nam",
    "Cambodia",
    "Laos",
    "Myanmar",
    "Bangladesh",
    "Pakistan",
    "Netherlands",
    "Belgium",
    "Switzerland",
    "Austria",
    "Sweden",
    "Norway",
    "Denmark",
    "Finland",
    "Ireland",
    "Portugal",
    "Greece",
    "Turkey",
    "Poland",
    "Czechia",
    "Czech Republic",
    "Slovakia",
    "Hungary",
    "Romania",
    "Bulgaria",
    "Ukraine",
    "Russia",
    "South Africa",
    "Nigeria",
    "Kenya",
    "Egypt",
    "Saudi Arabia",
    "UAE",
    "United Arab Emirates",
    "Qatar",
  ].map((s) => s.toLowerCase()),
);
const US_STATES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "IA",
  "ID",
  "IL",
  "IN",
  "KS",
  "KY",
  "LA",
  "MA",
  "MD",
  "ME",
  "MI",
  "MN",
  "MO",
  "MS",
  "MT",
  "NC",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NM",
  "NV",
  "NY",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "VT",
  "WA",
  "WI",
  "WV",
  "WY",
  "DC",
]);
function stripZipAndTrim(s: string): string {
  return s
    .replace(/\b\d{4,}(?:-\d{3,})?\b\s*$/i, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}
function detectCountry(addr: string): string | undefined {
  const parts = addr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  const tail = parts[parts.length - 1].toLowerCase();
  return KNOWN_COUNTRIES.has(tail) ? parts[parts.length - 1] : undefined;
}
function extractCityRegion(addr: string): { city?: string; region?: string } {
  const parts = addr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return {};
  const tail = parts[parts.length - 1];
  const stateCode = (tail.match(/\b([A-Z]{2})\b/) || [])[1];
  if (stateCode && US_STATES.has(stateCode)) {
    return { city: parts[parts.length - 2], region: stateCode };
  }
  const region = stripZipAndTrim(tail);
  return { city: parts[parts.length - 2], region: region || undefined };
}
function candidatesByLevel(pet: Pet): string[][] {
  const sAddr = (pet.shelterAddress || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, ", ")
    .trim();
  const sName = (pet.shelterName || pet.name || "").trim();
  const noZip = sAddr ? stripZipAndTrim(sAddr) : "";
  const foundCountry = sAddr ? detectCountry(sAddr) : undefined;
  const fallbackCountry = foundCountry || DEFAULT_COUNTRY;
  const { city, region } = noZip ? extractCityRegion(noZip) : {};

  const L0 = new Set<string>();
  const L1 = new Set<string>();
  const L2 = new Set<string>();
  const L3 = new Set<string>();

  if (sAddr) L0.add(sAddr);
  if (noZip && noZip !== sAddr) L0.add(noZip);
  if (noZip && sName) L0.add(`${sName}, ${noZip}`);

  if (city && region)
    L1.add(`${city}, ${region}${foundCountry ? "" : `, ${fallbackCountry}`}`);

  if (region) L2.add(`${region}${foundCountry ? "" : `, ${fallbackCountry}`}`);
  if (sName) L2.add(`${sName}${foundCountry ? "" : `, ${fallbackCountry}`}`);

  L3.add(foundCountry || fallbackCountry);

  return [Array.from(L0), Array.from(L1), Array.from(L2), Array.from(L3)];
}

// ---------- pMap with fixed concurrency = 48 ----------
async function pMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onEach?: (r: R, i: number) => void,
) {
  let i = 0;
  const results: Promise<void>[] = [];
  const run = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        const r = await mapper(items[idx], idx);
        onEach?.(r, idx);
      } catch {
        // ignore
      }
    }
  };
  for (let k = 0; k < Math.min(concurrency, items.length); k++) {
    results.push(run());
  }
  await Promise.allSettled(results);
}

const MapPage: NextPage = () => {
  const [leafletReady, setLeafletReady] = useState(false);
  const [clusterReady, setClusterReady] = useState(false);

  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const groupRef = useRef<any>(null); // cluster or simple group fallback
  const markerMapRef = useRef<Record<string, any>>({});
  const boundsRef = useRef<any>(null);

  // Light/Dark tiles
  const computeIsDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const [isDark, setIsDark] = useState(computeIsDark());
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(computeIsDark()));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const tiles = useMemo(
    () =>
      isDark
        ? {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          }
        : {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
    [isDark],
  );

  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);

  // Pagination
  const [pageSize, setPageSize] = useState(48);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(allPets.length / pageSize));
  const pagePets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allPets.slice(start, start + pageSize);
  }, [allPets, page, pageSize]);

  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [points, setPoints] = useState<PointsItem[]>([]);
  const runIdRef = useRef(0);
  const [refreshTick, setRefreshTick] = useState(0);

  // Load Leaflet & cluster plugin, then init map
  useEffect(() => {
    if (!leafletReady || !clusterReady || mapRef.current || !(window as any).L)
      return;
    const L = (window as any).L;

    // default icon fix
    L.Marker.prototype.options.icon = L.icon({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41],
    });

    const map = L.map("pets-map", {
      center: [20, 0],
      zoom: 2,
      scrollWheelZoom: true,
      attributionControl: false,
    });
    mapRef.current = map;

    tileLayerRef.current = L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
    }).addTo(map);
    L.control
      .attribution({ prefix: false })
      .addAttribution(tiles.attribution)
      .addTo(map);

    // Safe cluster fallback
    const hasCluster =
      typeof (L as any).markerClusterGroup === "function" ||
      typeof (L as any).MarkerClusterGroup === "function";

    // @ts-ignore
    groupRef.current = hasCluster
      ? // @ts-ignore
        L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
        })
      : L.layerGroup();

    map.addLayer(groupRef.current);
    boundsRef.current = L.latLngBounds([]);
  }, [leafletReady, clusterReady, tiles]);

  useEffect(() => {
    if (!mapRef.current || !(window as any).L) return;
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);
    const L = (window as any).L;
    tileLayerRef.current = L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
    }).addTo(mapRef.current);
  }, [tiles]);

  // Fetch pets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingPets(true);
        const pets = await petApi.listPets();
        if (!cancelled) setAllPets(pets);
      } catch {
        toast.error("Failed to load pets");
      } finally {
        if (!cancelled) setLoadingPets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearMarkers = useCallback(() => {
    if (!mapRef.current || !groupRef.current) return;
    groupRef.current.clearLayers?.();
    markerMapRef.current = {};
    const L = (window as any).L;
    boundsRef.current = L.latLngBounds([]);
  }, []);

  const addMarker = useCallback((pet: Pet, hit: GeocodeHit) => {
    if (!mapRef.current || !(window as any).L || !groupRef.current) return;
    if (markerMapRef.current[pet.id]) return; // dedupe
    const L = (window as any).L;

    const marker = L.marker([hit.lat, hit.lon]);
    markerMapRef.current[pet.id] = marker;

    // white popup, dark text
    const img = pet.photoUrl
      ? `<img src="${pet.photoUrl}" alt="${pet.name}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
      : "";
    const popup = `
      <div style="max-width:260px;background:#fff;color:#111;line-height:1.25">
        ${img}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:#EDF6F3;color:#234851">🐾</span>
          <h3 style="margin:0;font-weight:800;font-size:16px;color:#111">${pet.name}</h3>
        </div>
        <div style="font-size:13px;color:#374151;margin-bottom:8px">
          ${pet.type}${pet.shelterName ? ` • ${pet.shelterName}` : ""}
        </div>
        ${pet.shelterAddress ? `<div style="font-size:13px;color:#374151;margin-bottom:10px;display:flex;gap:6px">📍 <span>${pet.shelterAddress}</span></div>` : ""}
        <a href="/pet/${pet.id}" style="display:inline-block;background:#234851;color:white;padding:8px 10px;border-radius:8px;font-weight:600;text-decoration:none">View profile</a>
      </div>
    `;
    marker.bindPopup(popup, { closeButton: true });

    groupRef.current.addLayer(marker);
    boundsRef.current.extend([hit.lat, hit.lon]);
  }, []);

  // Main geocoding pipeline — 48-way parallel and cache-first
  useEffect(() => {
    if (!pagePets.length || !mapRef.current) {
      setPoints([]);
      clearMarkers();
      return;
    }

    // Load caches
    type QueryCache = Record<string, { hit: GeocodeHit; ts: number }>;
    type PetCache = Record<string, { hit: GeocodeHit; ts: number }>;
    const queryCache = loadCache<QueryCache>(GLOBAL_QUERY_CACHE_KEY, {});
    const petCache = loadCache<PetCache>(GLOBAL_PET_CACHE_KEY, {});

    const myRun = ++runIdRef.current;
    const controller = new AbortController();

    setPoints([]);
    clearMarkers();

    // 0) Instant from PET cache
    let mapped = 0;
    for (const pet of pagePets) {
      const entry = petCache[pet.id];
      if (entry && isFresh(entry.ts)) {
        addMarker(pet, entry.hit);
        mapped++;
      }
    }
    setPoints(
      pagePets
        .filter((pp) => petCache[pp.id] && isFresh(petCache[pp.id].ts))
        .map((pp) => ({ pet: pp, hit: petCache[pp.id].hit })),
    );
    if (mapped > 0 && boundsRef.current?.isValid()) {
      mapRef.current!.fitBounds(boundsRef.current.pad(0.15), { animate: true });
    }

    // 1) Build unresolved set and candidate queries (by level)
    const unresolved = new Set(
      pagePets
        .filter((pp) => !(petCache[pp.id] && isFresh(petCache[pp.id].ts)))
        .map((pp) => pp.id),
    );
    if (unresolved.size === 0) {
      setProgress({ done: pagePets.length, total: pagePets.length });
      return;
    }

    const petLevels = new Map<string, string[][]>();
    for (const pet of pagePets) petLevels.set(pet.id, candidatesByLevel(pet));

    // Helper to apply a hit to all pets referencing a query
    const applyHitToPets = (petIds: string[], hit: GeocodeHit) => {
      for (const pid of petIds) {
        if (!unresolved.has(pid)) continue;
        const p = pagePets.find((x) => x.id === pid);
        if (!p) continue;
        petCache[pid] = { hit, ts: now() };
        addMarker(p, hit);
        setPoints((prev) =>
          prev.find((x) => x.pet.id === pid)
            ? prev
            : [...prev, { pet: p, hit }],
        );
        unresolved.delete(pid);
      }
      saveCache(GLOBAL_PET_CACHE_KEY, petCache);
    };

    (async () => {
      setGeocoding(true);
      setProgress({
        done: pagePets.length - unresolved.size,
        total: pagePets.length,
      });

      // Process level by level, but within each level run EXACTLY 48 in parallel.
      for (let level = 0; level < 4; level++) {
        if (runIdRef.current !== myRun) return;
        if (unresolved.size === 0) break;

        // Map: query -> list of petIds that will accept this level result
        const candidateToPets = new Map<string, string[]>();
        for (const pid of Array.from(unresolved)) {
          const levels = petLevels.get(pid)!;
          const cands = levels[level] || [];
          for (const q of cands) {
            const arr = candidateToPets.get(q) || [];
            arr.push(pid);
            candidateToPets.set(q, arr);
          }
        }

        // First: satisfy from QUERY cache
        for (const [q, petIds] of candidateToPets) {
          const entry = queryCache[q];
          if (entry && isFresh(entry.ts)) {
            applyHitToPets(petIds, entry.hit);
            candidateToPets.delete(q);
          }
        }
        setProgress({
          done: pagePets.length - unresolved.size,
          total: pagePets.length,
        });
        if (unresolved.size === 0) break;

        // Next: network geocode remaining queries at this level, 48-way parallel
        const pendingQueries = Array.from(candidateToPets.keys());

        await pMap(
          pendingQueries,
          async (q) => {
            if (runIdRef.current !== myRun) return null;
            const hit = await geocode(q, controller.signal);
            if (!hit) return null;

            // store to query cache
            queryCache[q] = { hit, ts: now() };
            saveCache(GLOBAL_QUERY_CACHE_KEY, queryCache);

            // apply to all pets that rely on this query
            const petIds = candidateToPets.get(q) || [];
            const before = unresolved.size;
            applyHitToPets(petIds, hit);

            // progress bump equals number of newly resolved pets
            const resolvedNow = before - unresolved.size;
            if (resolvedNow > 0) {
              setProgress((prev) => ({
                done: Math.min(prev.done + resolvedNow, prev.total),
                total: prev.total,
              }));
            }
            return null;
          },
          CONCURRENCY,
        );
      }
    })()
      .catch(() => {
        toast.error("Geocoding failed for this page");
      })
      .finally(() => {
        if (runIdRef.current !== myRun) return;
        setGeocoding(false);
        const b = boundsRef.current;
        if (b && b.isValid()) {
          mapRef.current.fitBounds(b.pad(0.15), { animate: true });
        } else {
          mapRef.current.setView([20, 0], 2);
        }
      });

    return () => controller.abort();
  }, [pagePets, addMarker, clearMarkers, refreshTick]);

  const recenter = () => {
    if (!mapRef.current) return;
    const b = boundsRef.current;
    if (b && b.isValid()) {
      mapRef.current.fitBounds(b.pad(0.15), { animate: true });
    }
  };
  const rerunThisPage = () => setRefreshTick((n) => n + 1);

  const clearLocalCache = () => {
    localStorage.removeItem(GLOBAL_QUERY_CACHE_KEY);
    localStorage.removeItem(GLOBAL_PET_CACHE_KEY);
    toast.success("Geocode cache cleared");
    setRefreshTick((n) => n + 1);
  };

  const progressLabel = geocoding
    ? `Geocoding ${progress.done}/${progress.total}...`
    : points.length
      ? `${points.length} mapped on this page`
      : "No mappable locations on this page";

  const shouldDim =
    loadingPets ||
    (geocoding && Object.keys(markerMapRef.current).length === 0);

  return (
    <Layout>
      <Head>
        <title>Pet Map | PetSwipe</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        />
      </Head>

      {/* Leaflet then cluster plugin */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onReady={() => setLeafletReady(true)}
      />
      <Script
        src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"
        strategy="afterInteractive"
        onReady={() => setClusterReady(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#234851] dark:text-[#B6EBE9]">
            Pet Map
          </h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={recenter}
              className="bg-white dark:bg-neutral-900 text-[#234851] dark:text-[#B6EBE9] border border-black/5 dark:border-white/10"
            >
              <Crosshair className="h-4 w-4" />
              Re-center
            </Button>
            <Button
              onClick={rerunThisPage}
              className="bg-[#234851] hover:bg-[#1b3a3f] text-white"
              title="Refresh (cache-first)"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={clearLocalCache}
              className="bg-white dark:bg-neutral-900 text-[#234851] dark:text-[#B6EBE9] border border-black/5 dark:border-white/10"
              title="Clear geocode cache"
            >
              <Trash2 className="h-4 w-4" />
              Clear cache
            </Button>
          </div>
        </div>

        {/* Rounded animated banner */}
        <div className="mb-5 rounded-2xl overflow-hidden">
          <div
            className="p-4 sm:p-5 text-sm sm:text-base animate-[bg-pan_12s_linear_infinite]"
            style={{
              background:
                "linear-gradient(90deg, rgba(35,72,81,0.10), rgba(111,207,151,0.10), rgba(35,72,81,0.10))",
              backgroundSize: "200% 100%",
            }}
          >
            <style jsx>{`
              @keyframes bg-pan {
                0% {
                  background-position: 0% 0%;
                }
                50% {
                  background-position: 100% 0%;
                }
                100% {
                  background-position: 0% 0%;
                }
              }
            `}</style>
            <div className="flex items-center gap-3">
              {geocoding ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#234851]" />
              ) : (
                <MapPin className="h-5 w-5 text-[#234851]" />
              )}
              <p className="text-gray-700 dark:text-gray-300">
                {progressLabel} • Page {page} / {totalPages} • {allPets.length}{" "}
                total pets
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              disabled={page <= 1}
              className="bg-white dark:bg-neutral-900 text-[#234851] dark:text-[#B6EBE9] border border-black/5 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
              disabled={page >= totalPages}
              className="bg-white dark:bg-neutral-900 text-[#234851] dark:text-[#B6EBE9] border border-black/5 dark:border-white/10"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex-1" />

          <label className="text-sm text-gray-600 dark:text-gray-300">
            Page size:&nbsp;
            <select
              className="rounded-md bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(parseInt(e.target.value, 10));
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Map + side list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of mapped pets */}
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl shadow border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900">
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
                <h2 className="font-semibold text-[#234851] dark:text-[#B6EBE9]">
                  Mapped on this page
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {progressLabel}
                </p>
              </div>

              <div className="max-h-[60vh] overflow-auto divide-y divide-black/5 dark:divide-white/10">
                {loadingPets ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#7097A8]" />
                  </div>
                ) : points.length === 0 && !geocoding ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-700 dark:text-gray-300">
                    Nothing to show on this page. Try the next page or refresh.
                  </div>
                ) : (
                  points.map(({ pet, hit }) => (
                    <button
                      key={pet.id}
                      onClick={() => {
                        if (!mapRef.current) return;
                        mapRef.current.setView(
                          [hit.lat, hit.lon],
                          Math.max(mapRef.current.getZoom(), 10),
                          { animate: true },
                        );
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-[#EDF6F3] dark:hover:bg-neutral-800 transition"
                    >
                      <div className="flex items-start gap-3">
                        {pet.photoUrl ? (
                          <img
                            src={pet.photoUrl}
                            alt={pet.name}
                            className="w-12 h-12 rounded-lg object-cover"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#EDF6F3] dark:bg-neutral-700 flex items-center justify-center text-[#234851]">
                            <MapPin className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {pet.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {pet.type}
                            {pet.shelterName ? ` • ${pet.shelterName}` : ""}
                          </div>
                          {pet.shelterAddress ? (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {pet.shelterAddress}
                            </div>
                          ) : null}
                          <div className="mt-2">
                            <Link href={`/pet/${pet.id}`}>
                              <span className="text-xs font-medium text-[#234851] dark:text-[#B6EBE9] underline">
                                View profile
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2 lg:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow border border-black/5 dark:border-white/10 bg-white dark:bg-neutral-900 relative">
              {shouldDim && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 dark:bg-black/20 pointer-events-none">
                  <Loader2 className="h-7 w-7 animate-spin text-[#7097A8]" />
                </div>
              )}
              <div id="pets-map" className="h-[70vh] w-full" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MapPage;
