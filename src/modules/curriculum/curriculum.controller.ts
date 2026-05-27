import "dotenv/config";
import { Request, Response } from "express";
import multer from "multer";
import {
    uploadCurriculumService,
    getUploadedCurriculumService,
    getDepartmentCurriculumService,
    getAllUploadedCurriculumService
} from "./curriculum.service";

interface AuthRequest extends Request {
    user?: { id: string };
}

export const uploadCurriculumController = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const { departmentId } = req.body;
        const file = req.file;
        const uploadedBy = req.user?.id;
        const response = await uploadCurriculumService({ file, departmentId, uploadedBy });
        return res.status(201).json(response);
    } catch (error) {
        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large" });
            }
        }
        return res.status(500).json({ message: "Upload failed" });
    }
};

export const getUploadedCurriculumController = async (req: Request, res: Response) => {
    const { id } = req.params;
    const response = await getUploadedCurriculumService({ id });
    return res.json(response);
};

export const getDepartmentCurriculumController = async (req: Request, res: Response) => {
    const { departmentId } = req.params;
    const response = await getDepartmentCurriculumService({ departmentId });
    return res.json(response);
};

export const getAllUploadedCurriculumController = async (req: Request, res: Response) => {
    const response = await getAllUploadedCurriculumService();
    return res.json(response);
};
