"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const index_1 = require("../index");
const User_1 = require("../entities/User");
const authMiddleware = async (req, res, next) => {
    // let token = req.cookies?.token as string | undefined;
    let token = "";
    if (!token) {
        const h = req.get("Authorization");
        if (h?.startsWith("Bearer "))
            token = h.slice(7);
    }
    console.log(token);
    if (!token) {
        res.status(401).json({ message: "Unauthorized: no token provided" });
        return;
    }
    try {
        const { userId } = (0, jwt_1.verifyToken)(token);
        const user = await index_1.AppDataSource.getRepository(User_1.AppUser).findOneBy({
            id: userId,
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized: user not found" });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
};
exports.authMiddleware = authMiddleware;
