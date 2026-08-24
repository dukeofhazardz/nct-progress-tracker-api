import { Request, Response, NextFunction } from "express";

export const protect = (req: any, res: Response, next: NextFunction) => {
  if (req.user && req.user.id === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
};