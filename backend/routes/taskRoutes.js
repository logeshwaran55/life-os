import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createTaskController,
  deleteTaskController,
  getTasksController,
  updateTaskController,
} from "../controllers/taskController.js";

const router = Router();

router.use(requireAuth);

router.get("/", getTasksController);
router.post("/", createTaskController);
router.put("/:id", updateTaskController);
router.delete("/:id", deleteTaskController);

export default router;
