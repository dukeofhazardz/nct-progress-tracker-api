import "dotenv/config";
import multer from "multer";
import { uploadCurriculumService, getUploadedCurriculumService, getDepartmentCurriculumService, getAllUploadedCurriculumService, generateSyllabusService, getDepartmentSyllabiService, getSyllabusByIdService } from "./curriculum.service";
export const uploadCurriculumController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const { departmentId } = req.body;
        const file = req.file;
        const uploadedBy = req.user?.id;
        const response = await uploadCurriculumService({ file, departmentId, uploadedBy });
        return res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large" });
            }
        }
        return res.status(500).json({ message: "Upload failed" });
    }
};
export const generateSyllabusController = async (req, res) => {
    try {
        const { courseTitle, difficultyLevel, durationWeeks, learningGoals, departmentId } = req.body;
        if (!courseTitle || !difficultyLevel || !durationWeeks || !departmentId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const response = await generateSyllabusService({
            courseTitle,
            difficultyLevel,
            durationWeeks,
            learningGoals: learningGoals || [],
            departmentId
        });
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Syllabus generation failed" });
    }
};
export const getDepartmentSyllabiController = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const response = await getDepartmentSyllabiService({ departmentId });
        return res.json(response);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
export const getSyllabusByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await getSyllabusByIdService({ id });
        return res.json(response);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
export const getUploadedCurriculumController = async (req, res) => {
    const { id } = req.params;
    const response = await getUploadedCurriculumService({ id });
    return res.json(response);
};
export const getDepartmentCurriculumController = async (req, res) => {
    const { departmentId } = req.params;
    const response = await getDepartmentCurriculumService({ departmentId });
    return res.json(response);
};
export const getAllUploadedCurriculumController = async (req, res) => {
    const response = await getAllUploadedCurriculumService();
    return res.json(response);
};
