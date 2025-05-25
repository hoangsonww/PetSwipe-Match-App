import { Router } from "express";
import {
  recordSwipe,
  listMySwipes,
  listMyLikedSwipes,
} from "../controllers/swipeController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

router.post("/", recordSwipe);
router.get("/me", listMySwipes);
router.get("/me/liked", listMyLikedSwipes);

export default router;
