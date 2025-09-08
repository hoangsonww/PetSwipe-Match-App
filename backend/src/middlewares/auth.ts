import { RequestHandler } from "express";
import { verifyToken } from "../utils/jwt";
import { AppDataSource } from "../index";
import { AppUser } from "../entities/User";

export const authMiddleware: RequestHandler = async (req, res, next) => {
  // Try reading token from query first to support EventSource connections
  const queryToken = (req as any).query?.token as string | undefined;
  let token = queryToken || "";
  if (!token) {
    const h = req.get("Authorization");
    if (h?.startsWith("Bearer ")) token = h.slice(7);
  }

  if (!token) {
    res.status(401).json({ message: "Unauthorized: no token provided" });
    return;
  }

  try {
    const { userId } = verifyToken(token);
    const user = await AppDataSource.getRepository(AppUser).findOneBy({
      id: userId,
    });
    if (!user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};
