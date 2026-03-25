import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createColumnController,
  deleteColumnController,
  getColumnsController,
  updateColumnController,
} from "../controllers/columnController.js";

const router = Router();

router.use(requireAuth);

router.get("/", getColumnsController);
router.post("/", createColumnController);
router.put("/:id", updateColumnController);
router.delete("/:id", deleteColumnController);

export default router;
