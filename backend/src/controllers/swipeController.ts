import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../index";
import { Swipe } from "../entities/Swipe";
import { Pet } from "../entities/Pet";
import { Conversation } from "../entities/Conversation";

const swipeRepo = () => AppDataSource.getRepository(Swipe);
const petRepo = () => AppDataSource.getRepository(Pet);
const conversationRepo = () => AppDataSource.getRepository(Conversation);

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

    // If user liked the pet, create a conversation automatically
    if (liked) {
      try {
        // Check if conversation already exists
        const existingConversation = await conversationRepo().findOne({
          where: { user: { id: req.user.id }, pet: { id: petId } },
        });

        if (!existingConversation) {
          const conversation = conversationRepo().create({
            user: req.user,
            pet,
            shelterEmail: pet.shelterContact,
          });
          await conversationRepo().save(conversation);
        }
      } catch (convErr) {
        // Log error but don't fail the swipe operation
        console.error("Failed to create conversation:", convErr);
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
