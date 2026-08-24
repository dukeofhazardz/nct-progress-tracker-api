import "dotenv/config";
import { createDepartmentService, getDepartmentService, getDepartmentsService } from "./department.service";
export const createDepartmentController = async (req, res) => {
    const { name } = req.body;
    const response = await createDepartmentService({ name });
    return res.status(201).json(response);
};
export const getDepartmentController = async (req, res) => {
    const { id } = req.params;
    const response = await getDepartmentService({ id });
    return res.json(response);
};
export const getDepartmentsController = async (req, res) => {
    const response = await getDepartmentsService();
    return res.json(response);
};
