import { RequestHandler } from "express";
import { verifyToken } from "../utils/jwt";
import { AppDataSource } from "../index";
import { AppUser } from "../entities/User";

export const authMiddleware: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const { userId } = verifyToken(token);
    const user = await AppDataSource.getRepository(AppUser).findOne({
      where: { id: userId },
    });
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};
