import "dotenv/config";
import { Request, Response } from "express";
import { createCohortService, getCohortService, getCohortsService } from "./cohort.service";


export const createCohortController = async (req: Request, res: Response) => {
    const { name, instructorId, departmentId } = req.body;
    const response = await createCohortService({ name, instructorId, departmentId });
    return res.status(201).json(response);
};

export const getCohortController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const response = await getCohortService({ id });
  return res.json(response);
};

export const getCohortsController = async (req: Request, res: Response) => {
  const response = await getCohortsService();

  return res.json(response);
};
