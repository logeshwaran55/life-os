import {
  createColumn,
  deleteColumn,
  getColumns,
  updateColumn,
} from "../services/columnService.js";
import { HttpError } from "../utils/httpError.js";

export const getColumnsController = async (req, res, next) => {
  try {
    const columns = await getColumns(req.user.id);
    res.json(columns);
  } catch (error) {
    next(error);
  }
};

export const createColumnController = async (req, res, next) => {
  try {
    const created = await createColumn(req.body, req.user.id);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateColumnController = async (req, res, next) => {
  try {
    const updated = await updateColumn(req.params.id, req.body, req.user.id);

    if (!updated) {
      throw new HttpError(404, "Column not found");
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteColumnController = async (req, res, next) => {
  try {
    const deleted = await deleteColumn(req.params.id, req.user.id);

    if (!deleted) {
      throw new HttpError(404, "Column not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
