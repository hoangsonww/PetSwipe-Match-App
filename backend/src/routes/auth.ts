import { Router } from "express";
import {
  signup,
  login,
  logout,
  verifyEmail,
  resetPassword,
} from "../controllers/authController";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/reset-password", resetPassword);

export default router;
