import mongoose from "mongoose";
import { ColumnModel } from "../models/Column.js";
import { HttpError } from "../utils/httpError.js";

const toObjectId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new HttpError(400, "Invalid user id");
  }

  return new mongoose.Types.ObjectId(userId);
};

const sanitizeColumnUpdates = (updates = {}) => {
  const sanitized = { ...updates };
  delete sanitized.userId;
  delete sanitized.id;
  delete sanitized._id;
  return sanitized;
};

export const getColumns = async (userId) => {
  const ownerId = toObjectId(userId);
  return ColumnModel.find({ userId: ownerId }).sort({ createdAt: 1 }).lean();
};

export const createColumn = async (columnPayload, userId) => {
  const ownerId = toObjectId(userId);
  const payload = {
    ...columnPayload,
    userId: ownerId,
  };

  if (!payload.id) {
    throw new HttpError(400, "Column id is required");
  }

  return ColumnModel.create(payload);
};

export const updateColumn = async (columnId, updates, userId) => {
  const ownerId = toObjectId(userId);
  const safeUpdates = sanitizeColumnUpdates(updates);
  return ColumnModel.findOneAndUpdate(
    { id: columnId, userId: ownerId },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  ).lean();
};

export const deleteColumn = async (columnId, userId) => {
  const ownerId = toObjectId(userId);
  return ColumnModel.findOneAndDelete({ id: columnId, userId: ownerId }).lean();
};
