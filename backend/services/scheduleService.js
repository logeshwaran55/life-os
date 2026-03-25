import mongoose from "mongoose";
import { ScheduleModel } from "../models/Schedule.js";
import { HttpError } from "../utils/httpError.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toObjectId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new HttpError(400, "Invalid user id");
  }

  return new mongoose.Types.ObjectId(userId);
};

const timeToMinutes = (value) => {
  const [hourRaw, minuteRaw] = String(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return NaN;
  }

  return hour * 60 + minute;
};

const validateScheduleShape = (payload) => {
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const date = typeof payload?.date === "string" ? payload.date.trim() : "";
  const startTime = typeof payload?.startTime === "string" ? payload.startTime.trim() : "";
  const endTime = typeof payload?.endTime === "string" ? payload.endTime.trim() : "";
  const completed = Boolean(payload?.completed);

  if (!title) {
    throw new HttpError(400, "Schedule title is required");
  }

  if (!DATE_PATTERN.test(date)) {
    throw new HttpError(400, "Date must use YYYY-MM-DD format");
  }

  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    throw new HttpError(400, "Start time and end time must use HH:mm format");
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new HttpError(400, "End time must be after start time");
  }

  return {
    title,
    date,
    startTime,
    endTime,
    completed,
  };
};

export const getSchedules = async (userId) => {
  const ownerId = toObjectId(userId);
  return ScheduleModel.find({ userId: ownerId })
    .sort({ date: 1, startTime: 1 })
    .lean();
};

export const createSchedule = async (payload, userId) => {
  const ownerId = toObjectId(userId);
  const validated = validateScheduleShape(payload);
  return ScheduleModel.create({
    ...validated,
    userId: ownerId,
  });
};

export const updateSchedule = async (scheduleId, updates, userId) => {
  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    throw new HttpError(400, "Invalid schedule id");
  }

  const ownerId = toObjectId(userId);

  const existing = await ScheduleModel.findOne({ _id: scheduleId, userId: ownerId }).lean();
  if (!existing) {
    return null;
  }

  const merged = {
    title: updates?.title ?? existing.title,
    date: updates?.date ?? existing.date,
    startTime: updates?.startTime ?? existing.startTime,
    endTime: updates?.endTime ?? existing.endTime,
    completed: typeof updates?.completed === "boolean" ? updates.completed : existing.completed,
  };

  const validated = validateScheduleShape(merged);

  return ScheduleModel.findOneAndUpdate(
    { _id: scheduleId, userId: ownerId },
    { $set: validated },
    { new: true, runValidators: true }
  ).lean();
};

export const deleteSchedule = async (scheduleId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    throw new HttpError(400, "Invalid schedule id");
  }

  const ownerId = toObjectId(userId);
  return ScheduleModel.findOneAndDelete({ _id: scheduleId, userId: ownerId }).lean();
};
