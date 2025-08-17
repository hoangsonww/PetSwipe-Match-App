import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Bad pet id" });
  }

  const upstreamBase = process.env.NEXT_PUBLIC_API_URL; // e.g. https://petswipe-api.vercel.app/api
  if (!upstreamBase) {
    return res.status(500).json({ message: "Missing NEXT_PUBLIC_API_URL" });
  }

  const upstream = `${upstreamBase}/pets/${encodeURIComponent(id)}`;

  // Forward Authorization if the client sent it (your axios/fetch on the client will add it)
  const headers: Record<string, string> = { accept: "application/json" };
  const auth = req.headers.authorization;
  if (auth) headers.authorization = Array.isArray(auth) ? auth[0] : auth;

  const r = await fetch(upstream, { method: "GET", headers });
  const text = await r.text();

  res.status(r.status);
  res.setHeader(
    "content-type",
    r.headers.get("content-type") || "application/json",
  );
  return res.send(text);
}
