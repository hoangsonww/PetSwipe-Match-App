import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
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
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { petApi, Pet } from "@/lib/api";

type PointsItem = { pet: Pet; lat: number; lon: number };

const PAGE_SIZE_OPTIONS = [24, 48, 96, 192];

const MapPage: NextPage = () => {
  const [leafletReady, setLeafletReady] = useState(false);
  const [clusterReady, setClusterReady] = useState(false);
  const router = useRouter();

  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const groupRef = useRef<any>(null);
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

  // Auth check
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      if (typeof window === "undefined") return;

      const raw = localStorage.getItem("jwt");
      if (!raw) {
        if (!cancelled) router.replace("/login");
        return;
      }

      const token = raw.replace(/^Bearer\s+/i, "");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("jwt");
          if (!cancelled) router.replace("/login");
        }
      } catch {
        // network hiccup: keep current page
      }
    };

    checkAuth();
    const id = setInterval(checkAuth, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

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

  const [points, setPoints] = useState<PointsItem[]>([]);

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
        // fail silently
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

  const addMarker = useCallback((pet: Pet, lat: number, lon: number) => {
    if (!mapRef.current || !(window as any).L || !groupRef.current) return;
    if (markerMapRef.current[pet.id]) return; // dedupe
    const L = (window as any).L;

    const marker = L.marker([lat, lon]);
    markerMapRef.current[pet.id] = marker;

    const img = pet.photoUrl
      ? `<img src="${pet.photoUrl}" alt="${pet.name}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
      : "";
    const popup = `
      <div style="max-width:260px;background:#fff;color:#111;line-height:1.25">
        ${img}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:#EDF6F3;color:#234851">&#128062;</span>
          <h3 style="margin:0;font-weight:800;font-size:16px;color:#111">${pet.name}</h3>
        </div>
        <div style="font-size:13px;color:#374151;margin-bottom:8px">
          ${pet.type}${pet.shelterName ? ` &bull; ${pet.shelterName}` : ""}
        </div>
        ${pet.shelterAddress ? `<div style="font-size:13px;color:#374151;margin-bottom:10px;display:flex;gap:6px">&#128205; <span>${pet.shelterAddress}</span></div>` : ""}
        <a href="/pet/${pet.id}" style="display:inline-block;background:#234851;color:white;padding:8px 10px;border-radius:8px;font-weight:600;text-decoration:none">View profile</a>
      </div>
    `;
    marker.bindPopup(popup, { closeButton: true });

    groupRef.current.addLayer(marker);
    boundsRef.current.extend([lat, lon]);
  }, []);

  // Plot pets from DB coordinates — no geocoding needed
  useEffect(() => {
    if (!mapRef.current) return;

    clearMarkers();

    const mapped: PointsItem[] = [];
    for (const pet of pagePets) {
      if (
        typeof pet.latitude === "number" &&
        typeof pet.longitude === "number"
      ) {
        addMarker(pet, pet.latitude, pet.longitude);
        mapped.push({ pet, lat: pet.latitude, lon: pet.longitude });
      }
    }

    setPoints(mapped);

    if (mapped.length > 0 && boundsRef.current?.isValid()) {
      mapRef.current.fitBounds(boundsRef.current.pad(0.15), { animate: true });
    } else {
      mapRef.current.setView([20, 0], 2);
    }
  }, [pagePets, addMarker, clearMarkers]);

  const recenter = () => {
    if (!mapRef.current) return;
    const b = boundsRef.current;
    if (b && b.isValid()) {
      mapRef.current.fitBounds(b.pad(0.15), { animate: true });
    }
  };

  const [geocodingAll, setGeocodingAll] = useState(false);
  const triggerBatchGeocode = async () => {
    try {
      setGeocodingAll(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pets/geocode`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwt")?.replace(/^Bearer\s+/i, "")}`,
          },
        },
      );
      if (!res.ok) throw new Error("Geocode request failed");
      const data = await res.json();
      toast.success(`Geocoded ${data.geocoded} pets`);
      // Reload pets to get fresh coordinates
      const pets = await petApi.listPets();
      setAllPets(pets);
    } catch {
      toast.error("Batch geocoding failed");
    } finally {
      setGeocodingAll(false);
    }
  };

  const unmappedCount = pagePets.filter(
    (p) => p.latitude == null || p.longitude == null,
  ).length;

  const progressLabel = geocodingAll
    ? "Geocoding..."
    : points.length
      ? `${points.length} mapped on this page`
      : "No mapped locations on this page";

  const shouldDim = loadingPets || geocodingAll;

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
            {unmappedCount > 0 && (
              <Button
                onClick={triggerBatchGeocode}
                disabled={geocodingAll}
                className="bg-[#234851] hover:bg-[#1b3a3f] text-white"
                title={`Geocode ${unmappedCount} unmapped pets`}
              >
                {geocodingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Geocode {unmappedCount} missing
              </Button>
            )}
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
              {geocodingAll ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#234851]" />
              ) : (
                <MapPin className="h-5 w-5 text-[#234851]" />
              )}
              <p className="text-gray-700 dark:text-gray-300">
                {progressLabel} &bull; Page {page} / {totalPages} &bull;{" "}
                {allPets.length} total pets
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
                ) : points.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-700 dark:text-gray-300">
                    {unmappedCount > 0
                      ? `${unmappedCount} pets need geocoding. Click "Geocode missing" above.`
                      : "Nothing to show on this page. Try the next page."}
                  </div>
                ) : (
                  points.map(({ pet, lat, lon }) => (
                    <button
                      key={pet.id}
                      onClick={() => {
                        if (!mapRef.current) return;
                        mapRef.current.setView(
                          [lat, lon],
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
                            {pet.shelterName
                              ? ` \u2022 ${pet.shelterName}`
                              : ""}
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
