import { Router } from "express";
import {
  uploadAvatarMiddleware,
  uploadAvatarHandler,
  getProfile,
  updateProfile,
  deleteAvatarHandler,
} from "../controllers/userController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

router.get("/me", getProfile);
router.put("/me", updateProfile);
router.post("/me/avatar", uploadAvatarMiddleware, uploadAvatarHandler);
router.delete("/me/avatar", deleteAvatarHandler);

export default router;
