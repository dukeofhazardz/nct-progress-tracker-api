import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../../generated/prisma/enums";

export type AuthRequest = Request & { user?: { id: string; role: Role } };

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: Role };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const allow = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ message: "You do not have permission to perform this action" });
    return;
  }
  next();
};
