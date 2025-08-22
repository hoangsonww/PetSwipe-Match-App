"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAvatarHandler = exports.updateProfile = exports.getProfile = exports.uploadAvatarHandler = exports.uploadAvatarMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../utils/supabase");
const index_1 = require("../index");
const User_1 = require("../entities/User");
const userRepo = () => index_1.AppDataSource.getRepository(User_1.AppUser);
const upload = (0, multer_1.default)(); // in-memory storage
exports.uploadAvatarMiddleware = upload.single("avatar");
/**
 * @openapi
 * /api/users/me/avatar:
 *   post:
 *     summary: Upload or replace the current user's avatar
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: The avatar image file
 *     responses:
 *       '200':
 *         description: URL of the uploaded avatar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *       '400':
 *         description: Missing file or user context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '401':
 *         description: Unauthorized (not logged in)
 *       '500':
 *         description: Internal server error
 */
const uploadAvatarHandler = async (req, res, next) => {
    try {
        if (!req.user || !req.file) {
            res.status(400).json({ message: "No user context or no file provided" });
            return;
        }
        const url = await (0, supabase_1.uploadAvatar)(req.file.buffer, req.file.originalname, req.file.mimetype);
        req.user.avatarUrl = url;
        await userRepo().save(req.user);
        res.json({ avatarUrl: url });
    }
    catch (err) {
        next(err);
    }
};
exports.uploadAvatarHandler = uploadAvatarHandler;
/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Retrieve the current user's profile
 *     tags:
 *       - Users
 *     responses:
 *       '200':
 *         description: The authenticated user's profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                       nullable: true
 *                     dob:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '401':
 *         description: Unauthorized (not logged in)
 *       '500':
 *         description: Internal server error
 */
const getProfile = (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { password, ...safe } = req.user;
        res.json({ user: safe });
    }
    catch (err) {
        next(err);
    }
};
exports.getProfile = getProfile;
/**
 * @openapi
 * /api/users/me:
 *   put:
 *     summary: Update the current user's profile details
 *     tags:
 *       - Users
 *     requestBody:
 *       description: Fields to update (any subset)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               bio:
 *                 type: string
 *             example:
 *               name: "Alex Smith"
 *               dob: "1990-05-15"
 *               bio: "Loves hiking and rescue pets."
 *     responses:
 *       '200':
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                       nullable: true
 *                     dob:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '401':
 *         description: Unauthorized (not logged in)
 *       '500':
 *         description: Internal server error
 */
const updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { name, dob, bio } = req.body;
        Object.assign(req.user, { name, dob, bio });
        await userRepo().save(req.user);
        const { password, ...safe } = req.user;
        res.json({ user: safe });
    }
    catch (err) {
        next(err);
    }
};
exports.updateProfile = updateProfile;
/**
 * @openapi
 * /api/users/me/avatar:
 *   delete:
 *     summary: Remove the current user's avatar (reset to default)
 *     tags:
 *       - Users
 *     responses:
 *       '200':
 *         description: Avatar removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *       '401':
 *         description: Unauthorized (not logged in)
 *       '500':
 *         description: Internal server error
 */
const deleteAvatarHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        req.user.avatarUrl = null;
        await userRepo().save(req.user);
        res.json({ avatarUrl: null });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteAvatarHandler = deleteAvatarHandler;
