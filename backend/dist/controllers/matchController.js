"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyMatches = exports.listMatches = exports.assignPets = void 0;
const index_1 = require("../index");
const Match_1 = require("../entities/Match");
const User_1 = require("../entities/User");
const Pet_1 = require("../entities/Pet");
const Swipe_1 = require("../entities/Swipe");
const matchRepo = () => index_1.AppDataSource.getRepository(Match_1.Match);
const userRepo = () => index_1.AppDataSource.getRepository(User_1.AppUser);
const petRepo = () => index_1.AppDataSource.getRepository(Pet_1.Pet);
/**
 * @openapi
 * /api/matches:
 *   post:
 *     summary: Manually assign specific pets to a user
 *     tags:
 *       - Matches
 *     requestBody:
 *       description: The user to match and the list of pet IDs
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
 *                 description: UUID of the user to receive matches
 *               petIds:
 *                 type: array
 *                 description: List of pet UUIDs to assign
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       '200':
 *         description: Matches successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assigned:
 *                   type: integer
 *                   description: Number of new pet–user matches created
 *       '400':
 *         description: Bad request (missing or invalid parameters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: User or one of the pets not found
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
const assignPets = async (req, res, next) => {
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
        if (pets.length !== petIds.length) {
            res.status(404).json({ message: "One or more pets not found" });
            return;
        }
        const matches = pets.map((pet) => matchRepo().create({ user, pet }));
        await matchRepo().save(matches);
        res.json({ assigned: matches.length });
    }
    catch (err) {
        next(err);
    }
};
exports.assignPets = assignPets;
/**
 * @openapi
 * /api/matches:
 *   get:
 *     summary: List all user–pet matches (for admin)
 *     tags:
 *       - Matches
 *     responses:
 *       '200':
 *         description: Array of all matches with user and pet data
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
 *                         nullable: true
 *                       dob:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       bio:
 *                         type: string
 *                         nullable: true
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
const listMatches = async (_req, res, next) => {
    try {
        const all = await matchRepo().find({ relations: ["user", "pet"] });
        res.json(all);
    }
    catch (err) {
        next(err);
    }
};
exports.listMatches = listMatches;
/**
 * @openapi
 * /api/matches/me:
 *   get:
 *     summary: List available pet matches for the current user
 *     tags:
 *       - Matches
 *     responses:
 *       '200':
 *         description: Array of available pets wrapped in match-like objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
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
 *                     description: When this match payload was generated
 *       '401':
 *         description: Unauthorized (no valid session)
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
const listMyMatches = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const availablePets = await index_1.AppDataSource.getRepository(Pet_1.Pet)
            .createQueryBuilder("pet")
            .leftJoin(Swipe_1.Swipe, "swipe", "swipe.petId = pet.id AND swipe.userId = :uid", { uid: req.user.id })
            .where("swipe.id IS NULL")
            .orderBy("pet.createdAt", "DESC")
            .getMany();
        const payload = availablePets.map((pet) => ({ pet }));
        res.json(payload);
    }
    catch (err) {
        next(err);
    }
};
exports.listMyMatches = listMyMatches;
