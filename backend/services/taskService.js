import mongoose from "mongoose";
import { TaskModel } from "../models/Task.js";
import { HttpError } from "../utils/httpError.js";

const toObjectId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new HttpError(400, "Invalid user id");
  }

  return new mongoose.Types.ObjectId(userId);
};

const sanitizeTaskUpdates = (updates = {}) => {
  const sanitized = { ...updates };
  delete sanitized.userId;
  delete sanitized.id;
  delete sanitized._id;
  return sanitized;
};

const validateTaskPayload = (payload) => {
  const name = payload?.values?.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new HttpError(400, "Task title is required");
  }
};

export const getTasks = async (userId) => {
  const ownerId = toObjectId(userId);
  return TaskModel.find({ userId: ownerId }).sort({ createdAt: 1 }).lean();
};

export const createTask = async (taskPayload, userId) => {
  const ownerId = toObjectId(userId);
  const payload = {
    ...taskPayload,
    userId: ownerId,
  };

  if (!payload.id) {
    throw new HttpError(400, "Task id is required");
  }

  validateTaskPayload(payload);

  return TaskModel.create(payload);
};

export const updateTask = async (taskId, updates, userId) => {
  const ownerId = toObjectId(userId);
  const safeUpdates = sanitizeTaskUpdates(updates);

  if (safeUpdates?.values && Object.prototype.hasOwnProperty.call(safeUpdates.values, "name")) {
    validateTaskPayload({ values: { name: safeUpdates.values.name } });
  }

  const updated = await TaskModel.findOneAndUpdate(
    { id: taskId, userId: ownerId },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  ).lean();

  return updated;
};

export const deleteTask = async (taskId, userId) => {
  const ownerId = toObjectId(userId);
  const deleted = await TaskModel.findOneAndDelete({ id: taskId, userId: ownerId }).lean();
  return deleted;
};
