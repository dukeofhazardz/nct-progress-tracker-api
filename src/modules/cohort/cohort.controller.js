import "dotenv/config";
import { createCohortService, getCohortService, getCohortsService } from "./cohort.service";
export const createCohortController = async (req, res) => {
    const { name, instructorId, departmentId } = req.body;
    const response = await createCohortService({ name, instructorId, departmentId });
    return res.status(201).json(response);
};
export const getCohortController = async (req, res) => {
    const { id } = req.params;
    const response = await getCohortService({ id });
    return res.json(response);
};
export const getCohortsController = async (req, res) => {
    const response = await getCohortsService();
    return res.json(response);
};
