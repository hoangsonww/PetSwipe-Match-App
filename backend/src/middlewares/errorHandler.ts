import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);
  const payload: { message: string; details?: unknown } = {
    message: err?.message || "Internal Server Error",
  };
  if (err?.details) {
    payload.details = err.details;
  } else if (err?.errorDetails) {
    payload.details = err.errorDetails;
  }
  res.status(err?.status || 500).json(payload);
}
