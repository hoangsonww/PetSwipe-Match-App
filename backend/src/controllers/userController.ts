import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadAvatar } from "../utils/supabase";
import { AppDataSource } from "../index";
import { AppUser } from "../entities/User";

const userRepo = () => AppDataSource.getRepository(AppUser);
const upload = multer(); // in-memory storage

export const uploadAvatarMiddleware = upload.single("avatar");

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
export const uploadAvatarHandler = async (
  req: Request & { user?: AppUser; file?: Express.Multer.File },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user || !req.file) {
      res.status(400).json({ message: "No user context or no file provided" });
      return;
    }
    const url = await uploadAvatar(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    req.user.avatarUrl = url;
    await userRepo().save(req.user);
    res.json({ avatarUrl: url });
  } catch (err) {
    next(err);
  }
};

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
export const getProfile = (
  req: Request & { user?: AppUser },
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { password, ...safe } = req.user;
    res.json({ user: safe });
  } catch (err) {
    next(err);
  }
};

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
export const updateProfile = async (
  req: Request & { user?: AppUser },
  res: Response,
  next: NextFunction,
): Promise<void> => {
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
  } catch (err) {
    next(err);
  }
};

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
export const deleteAvatarHandler = async (
  req: Request & { user?: AppUser },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user.avatarUrl = null;
    await userRepo().save(req.user);
    res.json({ avatarUrl: null });
  } catch (err) {
    next(err);
  }
};
