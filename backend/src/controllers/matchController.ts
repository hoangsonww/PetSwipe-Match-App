import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../index";
import { Match } from "../entities/Match";
import { AppUser } from "../entities/User";
import { Pet } from "../entities/Pet";

const matchRepo = () => AppDataSource.getRepository(Match);
const userRepo = () => AppDataSource.getRepository(AppUser);
const petRepo = () => AppDataSource.getRepository(Pet);

/**
 * @openapi
 * /api/matches:
 *   post:
 *     summary: Manually assign specific pets to a user
 *     tags:
 *       - Matches
 *     requestBody:
 *       description: User ID and list of Pet IDs to match
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - petIds
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               petIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       '200':
 *         description: Number of matches created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assigned:
 *                   type: integer
 *                   description: How many new pet–user matches were created
 *       '400':
 *         description: Bad request (missing or invalid parameters)
 *       '404':
 *         description: User or pet not found
 *       '500':
 *         description: Internal server error
 */
export const assignPets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, petIds } = req.body;
    if (!userId || !Array.isArray(petIds)) {
      res.status(400).json({ message: "userId and petIds required" });
      return;
    }

    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const pets = await petRepo().findByIds(petIds);
    const matches = pets.map((pet) => matchRepo().create({ user, pet }));
    await matchRepo().save(matches);
    res.json({ assigned: matches.length });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/matches:
 *   get:
 *     summary: List all user–pet matches (admin use)
 *     tags:
 *       - Matches
 *     responses:
 *       '200':
 *         description: Array of all matches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                         format: email
 *                       name:
 *                         type: string
 *                       dob:
 *                         type: string
 *                         format: date
 *                       bio:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                   pet:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       photoUrl:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                   matchedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the match was created
 *       '500':
 *         description: Internal server error
 */
export const listMatches = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const all = await matchRepo().find({ relations: ["user", "pet"] });
    res.json(all);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/matches/me:
 *   get:
 *     summary: List all pet matches for the authenticated user
 *     tags:
 *       - Matches
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Array of matches belonging to the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   pet:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       photoUrl:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                   matchedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when this match was created
 *       '401':
 *         description: Unauthorized (no valid session)
 *       '500':
 *         description: Internal server error
 */
export const listMyMatches = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const mine = await matchRepo().find({
      where: { user: { id: req.user.id } },
      relations: ["pet"],
    });
    res.json(mine);
  } catch (err) {
    next(err);
  }
};
