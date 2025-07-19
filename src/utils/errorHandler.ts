import { NextFunction, Request, Response } from "express";

export function errorHandler( req: Request, res: Response) {
  res.status(500).json({
    error: "Something went wrong!",
    // message: err.message,
  });
}
