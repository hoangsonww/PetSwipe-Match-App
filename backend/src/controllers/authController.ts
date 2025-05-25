import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../index";
import { AppUser } from "../entities/User";
import { generateToken } from "../utils/jwt";
import { assignPetsToUser } from "../utils/assignmentHelper";

const userRepo = () => AppDataSource.getRepository(AppUser);

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user and sign them in
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Signup payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               bio:
 *                 type: string
 *     responses:
 *       '201':
 *         description: User created successfully
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
 *                     dob:
 *                       type: string
 *                       format: date
 *                     bio:
 *                       type: string
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
 *       '400':
 *         description: Missing or invalid parameters / email in use
 *       '500':
 *         description: Internal server error
 */
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, name, dob, bio } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password required" });
      return;
    }

    const exists = await userRepo().findOne({ where: { email } });
    if (exists) {
      res.status(400).json({ message: "Email in use" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = userRepo().create({ email, password: hashed, name, dob, bio });
    await userRepo().save(user);

    const token = generateToken(user.id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    try {
      await assignPetsToUser(user.id);
    } catch (e) {
      console.error("Seed-match error:", e);
    }

    const { password: _, ...rest } = user;
    res.status(201).json({ user: rest });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log a user in
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Login payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: Logged in successfully
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
 *                     dob:
 *                       type: string
 *                       format: date
 *                     bio:
 *                       type: string
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
 *       '400':
 *         description: Invalid credentials
 *       '500':
 *         description: Internal server error
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await userRepo().findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password!))) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    try {
      await assignPetsToUser(user.id, 20);
    } catch (e) {
      console.error("Login-match error:", e);
    }

    const { password: _, ...rest } = user;
    res.json({ user: rest });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags:
 *       - Auth
 *     responses:
 *       '200':
 *         description: Successfully logged out
 *       '500':
 *         description: Internal server error
 */
export const logout = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Check if an email is already registered
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Email to verify
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: Email exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing email parameter
 *       '404':
 *         description: Email not found
 *       '500':
 *         description: Internal server error
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email required" });
      return;
    }
    const user = await userRepo().findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Email not found" });
      return;
    }
    res.json({ message: "Email exists" });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset a user's password
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Payload to reset password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing parameters
 *       '404':
 *         description: Email not found
 *       '500':
 *         description: Internal server error
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ message: "Email and newPassword required" });
      return;
    }
    const user = await userRepo().findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Email not found" });
      return;
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await userRepo().save(user);
    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};
