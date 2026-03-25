import { HttpError } from "../utils/httpError.js";

export const notFoundHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const globalErrorHandler = (error, _req, res, _next) => {
  const statusCode =
    typeof error?.statusCode === "number"
      ? error.statusCode
      : error?.name === "ValidationError"
        ? 400
        : 500;

  const message =
    typeof error?.message === "string" && error.message.trim().length > 0
      ? error.message
      : "Something went wrong";

  const payload = {
    success: false,
    message,
  };

  if (error instanceof HttpError && error.details != null) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
};
