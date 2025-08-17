import { Router } from "express";
import {
  uploadPets,
  listPets,
  exportPets,
  uploadPetPhoto,
  createPet,
  getPetById,
  updatePet,
  listMyCreatedPets,
} from "../controllers/petController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", createPet);
router.post("/upload", ...uploadPets);
router.get("/", listPets);
router.get("/export", exportPets);
router.get("/mine", listMyCreatedPets);
router.put("/:petId", updatePet);
router.post("/:petId/photo", ...uploadPetPhoto);
router.get("/:petId", getPetById);

export default router;
