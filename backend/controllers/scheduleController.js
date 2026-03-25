import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
} from "../services/scheduleService.js";
import { HttpError } from "../utils/httpError.js";

const toScheduleDto = (schedule) => ({
  id: String(schedule._id),
  title: schedule.title,
  date: schedule.date,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  completed: Boolean(schedule.completed),
});

export const getSchedulesController = async (req, res, next) => {
  try {
    const schedules = await getSchedules(req.user.id);
    res.json(schedules.map(toScheduleDto));
  } catch (error) {
    next(error);
  }
};

export const createScheduleController = async (req, res, next) => {
  try {
    const created = await createSchedule(req.body, req.user.id);
    res.status(201).json(toScheduleDto(created));
  } catch (error) {
    next(error);
  }
};

export const updateScheduleController = async (req, res, next) => {
  try {
    const updated = await updateSchedule(req.params.id, req.body, req.user.id);
    if (!updated) {
      throw new HttpError(404, "Schedule not found");
    }

    res.json(toScheduleDto(updated));
  } catch (error) {
    next(error);
  }
};

export const deleteScheduleController = async (req, res, next) => {
  try {
    const deleted = await deleteSchedule(req.params.id, req.user.id);
    if (!deleted) {
      throw new HttpError(404, "Schedule not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
