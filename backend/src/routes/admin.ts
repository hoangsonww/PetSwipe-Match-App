import { Router } from "express";
import { 
  getScoringWeightsEndpoint, 
  updateScoringWeightsEndpoint 
} from "../controllers/deckController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.get("/ranking/weights", getScoringWeightsEndpoint);
router.put("/ranking/weights", updateScoringWeightsEndpoint);

export default router;