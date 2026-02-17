import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  listMyJourneys,
  updateJourney,
  addTask,
  updateTask,
  deleteTask,
} from "../controllers/adoptionJourneyController";

const router = Router();

router.use(authMiddleware);

router.get("/me", listMyJourneys);
router.patch("/:journeyId", updateJourney);
router.post("/:journeyId/tasks", addTask);
router.patch("/:journeyId/tasks/:taskId", updateTask);
router.delete("/:journeyId/tasks/:taskId", deleteTask);

export default router;
