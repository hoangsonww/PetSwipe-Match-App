import { Router } from "express";
import { chatHandler } from "../controllers/chatController";
import { authMiddleware } from "../middlewares/auth";

export const router = Router();

router.use(authMiddleware);
router.post("/", chatHandler);

export default router;
