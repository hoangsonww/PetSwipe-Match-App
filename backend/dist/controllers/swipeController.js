"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyLikedSwipes = exports.listMySwipes = exports.recordSwipe = void 0;
const index_1 = require("../index");
const Swipe_1 = require("../entities/Swipe");
const Pet_1 = require("../entities/Pet");
const swipeRepo = () => index_1.AppDataSource.getRepository(Swipe_1.Swipe);
const petRepo = () => index_1.AppDataSource.getRepository(Pet_1.Pet);
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
const recordSwipe = async (req, res, next) => {
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
        res.json(swipe);
    }
    catch (err) {
        next(err);
    }
};
exports.recordSwipe = recordSwipe;
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
const listMySwipes = async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
};
exports.listMySwipes = listMySwipes;
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
const listMyLikedSwipes = async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
};
exports.listMyLikedSwipes = listMyLikedSwipes;
