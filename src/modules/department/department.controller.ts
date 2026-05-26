import "dotenv/config";
import { Request, Response } from "express";
import { createDepartmentService, getDepartmentService, getDepartmentsService } from "./department.service";


export const createDepartmentController = async (req: Request, res: Response) => {
    const { name } = req.body;
    const response = await createDepartmentService({ name });
    return res.status(201).json(response);
};

export const getDepartmentController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const response = await getDepartmentService({ id });
  return res.json(response);
};

export const getDepartmentsController = async (req: Request, res: Response) => {
  const response = await getDepartmentsService();
  return res.json(response);
};
