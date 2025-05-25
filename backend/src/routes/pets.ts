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

// protect all /pets routes
router.use(authMiddleware);

router.post("/", authMiddleware, createPet);

// import CSV of pets
router.post("/upload", uploadPets);

// list & export
router.get("/", listPets);
router.get("/export", exportPets);

// photo upload – spread the two middlewares [multer.single, handler]
router.post("/:petId/photo", ...uploadPetPhoto);

export default router;
