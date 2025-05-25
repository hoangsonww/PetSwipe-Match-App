import { Router } from "express";
import {
  uploadPets,
  listPets,
  exportPets,
  uploadPetPhoto,
  createPet,
} from "../controllers/petController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", createPet);
router.post("/upload", uploadPets);
router.get("/", listPets);
router.get("/export", exportPets);
router.post("/:petId/photo", ...uploadPetPhoto);

export default router;
