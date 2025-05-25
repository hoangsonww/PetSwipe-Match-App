import { Router } from "express";
import {
  assignPets,
  listMatches,
  listMyMatches,
} from "../controllers/matchController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

router.post("/", assignPets);
router.get("/", listMatches);
router.get("/me", listMyMatches);

export default router;
