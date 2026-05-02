import { ErrorRequestHandler } from "express";

export const corsErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    res.status(403).json({ success: false, message: 'Origin not allowed' });
    return;
  }
  res.status(500).json({ success: false, message: 'Internal Server Error' });
};