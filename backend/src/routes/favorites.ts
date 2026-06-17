import { Router } from "express";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "../controllers/favoriteController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

router.post("/", addFavorite);
router.get("/", listFavorites);
router.delete("/:petId", removeFavorite);

export default router;
