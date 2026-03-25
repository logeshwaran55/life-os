import { Router } from "express";
import mongoose from "mongoose";
import { TaskModel } from "../models/Task.js";

const router = Router();

// GET /api/tasks - return all tasks
router.get("/", async (_req, res) => {
  try {
    const tasks = await TaskModel.find().sort({ createdAt: 1 }).lean();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error: String(error) });
  }
});

// POST /api/tasks - create a new task
router.post("/", async (req, res) => {
  try {
    const { values = {}, completed = false, completedAt = null, id, createdAt } = req.body;

    const task = await TaskModel.create({
      id: id ?? new mongoose.Types.ObjectId().toString(),
      values,
      completed,
      completedAt,
      createdAt: createdAt ?? new Date().toISOString(),
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: "Failed to create task", error: String(error) });
  }
});

// PUT /api/tasks/:id - update an existing task
router.put("/:id", async (req, res) => {
  try {
    const updatedTask = await TaskModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTask) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: "Failed to update task", error: String(error) });
  }
});

// DELETE /api/tasks/:id - delete a task
router.delete("/:id", async (req, res) => {
  try {
    const deletedTask = await TaskModel.findOneAndDelete({ id: req.params.id }).lean();

    if (!deletedTask) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: "Failed to delete task", error: String(error) });
  }
});

export default router;
