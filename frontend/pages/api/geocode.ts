import type { NextApiRequest, NextApiResponse } from "next";

type LatLng = { lat: number; lon: number };
type Ok = LatLng & { source: "nominatim" | "photon"; query: string };
type Err = { message: string };

async function geocodeNominatim(q: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(
    q,
  )}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PetSwipe/1.0 (support@petswipe.example)",
        Accept: "application/json",
        Referer: "http://localhost:3000",
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
    const res = await fetch(url, { headers: { Accept: "application/json" } });
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
  const q = req.query.q;
  if (!q || typeof q !== "string") {
    res.status(400).json({ message: "Missing q param" });
    return;
  }

  // Try Nominatim → Photon
  const a = await geocodeNominatim(q);
  if (a) {
    res.status(200).json({ ...a, source: "nominatim", query: q });
    return;
  }

  const b = await geocodePhoton(q);
  if (b) {
    res.status(200).json({ ...b, source: "photon", query: q });
    return;
  }

  res.status(404).json({ message: "No result" });
}
