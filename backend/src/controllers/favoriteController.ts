import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../index";
import { Favorite } from "../entities/Favorite";
import { Pet } from "../entities/Pet";

const favRepo = () => AppDataSource.getRepository(Favorite);
const petRepo = () => AppDataSource.getRepository(Pet);

/**
 * @openapi
 * /api/favorites:
 *   post:
 *     summary: Add a pet to the current user's favorites
 *     tags:
 *       - Favorites
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *             properties:
 *               petId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       '200':
 *         description: The created favorite record
 *       '400':
 *         description: Missing or invalid petId
 *       '401':
 *         description: Not authenticated
 *       '404':
 *         description: Pet not found
 *       '409':
 *         description: Already favorited
 */
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { petId } = req.body ?? {};
    if (typeof petId !== "string") {
      res.status(400).json({ message: "petId required" });
      return;
    }
    const pet = await petRepo().findOne({ where: { id: petId } });
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }
    const existing = await favRepo().findOne({
      where: { user: { id: req.user.id }, pet: { id: pet.id } },
    });
    if (existing) {
      res.status(409).json({ message: "Already favorited" });
      return;
    }
    const fav = favRepo().create({ user: { id: req.user.id } as any, pet });
    await favRepo().save(fav);
    res.json(fav);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     summary: List the current user's favorite pets
 *     tags:
 *       - Favorites
 *     responses:
 *       '200':
 *         description: Array of favorites
 *       '401':
 *         description: Not authenticated
 */
export const listFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const favs = await favRepo().find({
      where: { user: { id: req.user.id } },
      relations: ["pet"],
      order: { favoritedAt: "DESC" },
    });
    res.json(favs);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/favorites/{petId}:
 *   delete:
 *     summary: Remove a pet from the current user's favorites
 *     tags:
 *       - Favorites
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '204':
 *         description: Removed
 *       '401':
 *         description: Not authenticated
 */
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const petId = req.params.petId;
    if (typeof petId !== "string") {
      res.status(400).json({ message: "petId required" });
      return;
    }
    await favRepo().delete({ user: { id: req.user.id }, pet: { id: petId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

