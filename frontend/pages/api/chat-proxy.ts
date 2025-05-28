import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  const jwt = req.headers.authorization || "";
  try {
    const upstream = await fetch(
      "https://petswipe-backend-api.vercel.app/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: jwt,
        },
        body: JSON.stringify(req.body),
      },
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ message: "Failed to reach PetSwipe backend" });
  }
}
