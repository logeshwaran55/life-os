import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createScheduleController,
  deleteScheduleController,
  getSchedulesController,
  updateScheduleController,
} from "../controllers/scheduleController.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSchedulesController);
router.post("/", createScheduleController);
router.put("/:id", updateScheduleController);
router.delete("/:id", deleteScheduleController);

export default router;
