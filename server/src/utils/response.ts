import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
