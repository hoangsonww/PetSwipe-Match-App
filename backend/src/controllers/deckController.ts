import { Request, Response, NextFunction } from "express";
import { generateDeck, removePetFromDeck, DeckRequest } from "../services/deckService";
import { getScoringWeights, updateScoringWeights } from "../services/scoringService";

/**
 * @openapi
 * /api/pets/deck:
 *   get:
 *     summary: Get a personalized, diverse deck of pets
 *     tags:
 *       - Pets
 *     description: |
 *       Returns a ranked, personalized deck of pets using the v1 relevance engine.
 *       Pets are scored based on user preferences, age, breed, recency, popularity, and diversity.
 *       Results are cached and exclude pets already swiped by the user.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of pets to return
 *       - in: query
 *         name: petType
 *         schema:
 *           type: string
 *         description: Filter by pet type (e.g., "Dog", "Cat")
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Minimum age in months
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum age in months
 *     responses:
 *       '200':
 *         description: Personalized deck of pets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       ageMonths:
 *                         type: integer
 *                         nullable: true
 *                       breed:
 *                         type: string
 *                         nullable: true
 *                       photoUrl:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       shelterName:
 *                         type: string
 *                         nullable: true
 *                       shelterContact:
 *                         type: string
 *                         nullable: true
 *                       shelterAddress:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       score:
 *                         type: number
 *                         description: Relevance score (0-1)
 *                       rank:
 *                         type: integer
 *                         description: Rank in deck (1-based)
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     strategy:
 *                       type: string
 *                     totalCandidates:
 *                       type: integer
 *                     cacheHit:
 *                       type: boolean
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Internal server error
 */
export const getDeck = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const petType = req.query.petType as string;
    const minAge = req.query.minAge ? parseInt(req.query.minAge as string) : undefined;
    const maxAge = req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined;

    const deckRequest: DeckRequest = {
      userId: (req.user as any).id,
      limit,
      filters: {
        petType,
        minAgeMonths: minAge,
        maxAgeMonths: maxAge,
      },
      strategy: "v1-rule-mmr",
    };

    const deck = await generateDeck(deckRequest);
    res.json(deck);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/admin/ranking/weights:
 *   get:
 *     summary: Get current scoring weights (admin only)
 *     tags:
 *       - Admin
 *     description: Returns the current scoring weights configuration
 *     responses:
 *       '200':
 *         description: Current scoring weights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 w_type:
 *                   type: number
 *                 w_age:
 *                   type: number
 *                 w_breed:
 *                   type: number
 *                 w_recency:
 *                   type: number
 *                 w_pop:
 *                   type: number
 *                 w_coldstart:
 *                   type: number
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Internal server error
 */
export const getScoringWeightsEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const weights = await getScoringWeights();
    res.json(weights);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/admin/ranking/weights:
 *   put:
 *     summary: Update scoring weights (admin only)
 *     tags:
 *       - Admin
 *     description: Updates the scoring weights configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               w_type:
 *                 type: number
 *               w_age:
 *                 type: number
 *               w_breed:
 *                 type: number
 *               w_recency:
 *                 type: number
 *               w_pop:
 *                 type: number
 *               w_coldstart:
 *                 type: number
 *     responses:
 *       '200':
 *         description: Weights updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '401':
 *         description: Authentication required
 *       '400':
 *         description: Invalid weights provided
 *       '500':
 *         description: Internal server error
 */
export const updateScoringWeightsEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { w_type, w_age, w_breed, w_recency, w_pop, w_coldstart } = req.body;

    // Basic validation
    const weights = { w_type, w_age, w_breed, w_recency, w_pop, w_coldstart };
    const values = Object.values(weights);
    
    if (values.some(v => typeof v !== "number" || v < 0 || v > 1)) {
      res.status(400).json({ message: "All weights must be numbers between 0 and 1" });
      return;
    }

    await updateScoringWeights(weights);
    res.json({ message: "Scoring weights updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Hook to remove pet from deck cache when swiped
 * Should be called from swipe controller
 */
export const onPetSwiped = async (userId: string, petId: string): Promise<void> => {
  try {
    await removePetFromDeck(userId, petId);
  } catch (error) {
    // Log error but don't fail the swipe operation
    console.error("Failed to update deck cache after swipe:", error);
  }
};