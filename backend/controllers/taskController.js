import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../services/taskService.js";
import { HttpError } from "../utils/httpError.js";

export const getTasksController = async (req, res, next) => {
  try {
    const tasks = await getTasks(req.user.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createTaskController = async (req, res, next) => {
  try {
    const created = await createTask(req.body, req.user.id);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (req, res, next) => {
  try {
    const updated = await updateTask(req.params.id, req.body, req.user.id);

    if (!updated) {
      throw new HttpError(404, "Task not found");
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (req, res, next) => {
  try {
    const deleted = await deleteTask(req.params.id, req.user.id);

    if (!deleted) {
      throw new HttpError(404, "Task not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
