import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../index";
import { Swipe } from "../entities/Swipe";
import { Pet } from "../entities/Pet";
import { AdoptionJourney, JourneyStatus } from "../entities/AdoptionJourney";
import { AdoptionTask } from "../entities/AdoptionTask";
import { DEFAULT_JOURNEY_TASKS } from "../utils/adoptionJourney";

const swipeRepo = () => AppDataSource.getRepository(Swipe);
const petRepo = () => AppDataSource.getRepository(Pet);
const journeyRepo = () => AppDataSource.getRepository(AdoptionJourney);
const taskRepo = () => AppDataSource.getRepository(AdoptionTask);

/**
 * @openapi
 * /api/swipes:
 *   post:
 *     summary: Record a swipe (like or dislike) on a pet
 *     tags:
 *       - Swipes
 *     requestBody:
 *       description: The pet to swipe on and whether it's liked
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *               - liked
 *             properties:
 *               petId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the pet being swiped
 *               liked:
 *                 type: boolean
 *                 description: True if user likes (adopt), false if passes
 *     responses:
 *       '200':
 *         description: The recorded swipe object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 pet:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                 liked:
 *                   type: boolean
 *                 swipedAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Bad request (missing or invalid parameters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '401':
 *         description: Unauthorized (user not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: Pet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '409':
 *         description: Conflict (user already swiped this pet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export const recordSwipe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { petId, liked } = req.body ?? {};
    if (typeof petId !== "string" || typeof liked !== "boolean") {
      res
        .status(400)
        .json({ message: "petId (uuid) and liked (boolean) required" });
      return;
    }

    const pet = await petRepo().findOne({ where: { id: petId } });
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }

    const existing = await swipeRepo().findOne({
      where: { user: { id: req.user.id }, pet: { id: petId } },
    });
    if (existing) {
      res.status(409).json({ message: "You have already swiped on this pet." });
      return;
    }

    const swipe = swipeRepo().create({
      user: req.user,
      pet,
      liked,
    });
    await swipeRepo().save(swipe);

    if (liked) {
      const existingJourney = await journeyRepo().findOne({
        where: { user: { id: req.user.id }, pet: { id: petId } },
      });

      if (!existingJourney) {
        const initialNotes = pet.shelterContact
          ? `Reach out to ${pet.shelterName ?? "the shelter"} at ${pet.shelterContact} to get the process started.`
          : `Start planning how you'll welcome ${pet.name} home.`;

        const journey = journeyRepo().create({
          user: req.user,
          pet,
          status: JourneyStatus.DISCOVERY,
          notes: initialNotes,
        });
        await journeyRepo().save(journey);

        if (DEFAULT_JOURNEY_TASKS.length > 0) {
          const tasks = DEFAULT_JOURNEY_TASKS.map((task) =>
            taskRepo().create({
              ...task,
              journey,
            }),
          );
          await taskRepo().save(tasks);
        }
      }
    }

    res.json(swipe);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/swipes/me:
 *   get:
 *     summary: List all swipes by the current user
 *     tags:
 *       - Swipes
 *     responses:
 *       '200':
 *         description: Array of swipe records (likes and passes)
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
 *                   liked:
 *                     type: boolean
 *                   swipedAt:
 *                     type: string
 *                     format: date-time
 *       '401':
 *         description: Unauthorized (user not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export const listMySwipes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const all = await swipeRepo().find({
      where: { user: { id: req.user.id } },
      relations: ["pet"],
      order: { swipedAt: "DESC" },
    });
    res.json(all);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/swipes/me/liked:
 *   get:
 *     summary: List only the pets the current user has liked
 *     tags:
 *       - Swipes
 *     responses:
 *       '200':
 *         description: Array of liked swipe records
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
 *                       photoUrl:
 *                         type: string
 *                         format: uri
 *                   liked:
 *                     type: boolean
 *                   swipedAt:
 *                     type: string
 *                     format: date-time
 *       '401':
 *         description: Unauthorized (user not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export const listMyLikedSwipes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const liked = await swipeRepo().find({
      where: { user: { id: req.user.id }, liked: true },
      relations: ["pet"],
      order: { swipedAt: "DESC" },
    });
    res.json(liked);
  } catch (err) {
    next(err);
  }
};
