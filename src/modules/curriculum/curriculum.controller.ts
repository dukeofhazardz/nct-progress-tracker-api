import "dotenv/config";
import { Request, Response } from "express";
import multer from "multer";
import {
    uploadCurriculumService,
    getUploadedCurriculumService,
    getDepartmentCurriculumService,
    getAllUploadedCurriculumService,
    generateSyllabusService,
    getDepartmentSyllabiService,
    getSyllabusByIdService
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

export const generateSyllabusController = async (req: Request, res: Response) => {
    try {
        const { courseTitle, difficultyLevel, durationWeeks, learningGoals, departmentId, daysPerWeek } = req.body;

        if (!courseTitle || !difficultyLevel || !durationWeeks || !departmentId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const response = await generateSyllabusService({
            courseTitle,
            difficultyLevel,
            durationWeeks,
            learningGoals: learningGoals || [],
            departmentId,
            daysPerWeek
        });
        return res.status(201).json(response);
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Syllabus generation failed" });
    }
};

export const getDepartmentSyllabiController = async (req: Request, res: Response) => {
    try {
        const { departmentId } = req.params;
        const response = await getDepartmentSyllabiService({ departmentId });
        return res.json(response);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const getSyllabusByIdController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const response = await getSyllabusByIdService({ id });
        return res.json(response);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
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
