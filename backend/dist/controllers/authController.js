"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyEmail = exports.logout = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const User_1 = require("../entities/User");
const jwt_1 = require("../utils/jwt");
const assignmentHelper_1 = require("../utils/assignmentHelper");
const userRepo = () => index_1.AppDataSource.getRepository(User_1.AppUser);
function cookieOpts(req) {
    // detect if this request arrived via HTTPS
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: "none",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user, assign initial pets, and sign them in
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
 *         description: User created and signed in successfully
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
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       '400':
 *         description: Missing or invalid parameters, or email already in use
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
const signup = async (req, res, next) => {
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
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = userRepo().create({ email, password: hashed, name, dob, bio });
        await userRepo().save(user);
        const token = (0, jwt_1.generateToken)(user.id);
        res.cookie("token", token, cookieOpts(req));
        // Assign default batch of pets (handled internally)
        try {
            await (0, assignmentHelper_1.assignPetsToUser)(user.id);
        }
        catch (e) {
            console.error("Seed-match error:", e);
        }
        const { password: _, ...rest } = user;
        res.status(201).json({ user: rest, token });
    }
    catch (err) {
        next(err);
    }
};
exports.signup = signup;
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user and return a JWT
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Login credentials
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
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       '400':
 *         description: Invalid credentials
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
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await userRepo().findOne({ where: { email } });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const token = (0, jwt_1.generateToken)(user.id);
        res.cookie("token", token, cookieOpts(req));
        // On each login, assign up to 20 new pet matches
        try {
            await (0, assignmentHelper_1.assignPetsToUser)(user.id, 20);
        }
        catch (e) {
            console.error("Login-match error:", e);
        }
        const { password: _, ...rest } = user;
        res.json({ user: rest, token });
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Clear authentication cookie to log the user out
 *     tags:
 *       - Auth
 *     responses:
 *       '200':
 *         description: Successfully logged out
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
const logout = (_req, res, next) => {
    try {
        res.clearCookie("token");
        res.json({ message: "Logged out" });
    }
    catch (err) {
        next(err);
    }
};
exports.logout = logout;
/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Check whether an email address is already registered
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: Email not found
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
const verifyEmail = async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
};
exports.verifyEmail = verifyEmail;
/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset a user's password given their email and a new password
 *     tags:
 *       - Auth
 *     requestBody:
 *       description: Password reset payload
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
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing email or newPassword
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: Email not found
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
const resetPassword = async (req, res, next) => {
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
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        await userRepo().save(user);
        res.json({ message: "Password updated" });
    }
    catch (err) {
        next(err);
    }
};
exports.resetPassword = resetPassword;
