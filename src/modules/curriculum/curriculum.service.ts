import { prisma } from "../../lib/prisma";
import { generateCourseOutline } from "../../lib/ai.service";

export const uploadCurriculumService = async ({ file, departmentId, uploadedBy }: any) => {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
        throw new Error("Department not found");
    }

    const curriculum = await prisma.curriculum.create({
        data: {
            name: department.name + " Curriculum " + new Date().toISOString(),
            fileName: file.originalname,
            fileType: file.mimetype,
            filePath: file.path,
            uploadedBy: uploadedBy,
            departmentId,
        },
    });

    return { curriculum, message: "Curriculum uploaded successfully" };
};

export const generateSyllabusService = async ({ courseTitle, difficultyLevel, durationWeeks, learningGoals, departmentId, daysPerWeek }: any) => {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
        throw new Error("Department not found");
    }

    const outline = await generateCourseOutline({
        course_title: courseTitle,
        difficulty_level: difficultyLevel,
        duration_weeks: durationWeeks,
        learning_goals: learningGoals,
        days_per_week: daysPerWeek
    });

    const syllabus = await prisma.syllabus.create({
        data: {
            courseTitle,
            difficultyLevel,
            durationWeeks,
            learningGoals,
            content: outline as any,
            departmentId
        }
    });

    return { syllabus, message: "Syllabus generated successfully" };
};

export const getUploadedCurriculumService = async ({ id }: any) => {
    const curriculum = await prisma.curriculum.findUnique({ where: { id } });
    if (!curriculum) {
        throw new Error("Curriculum not found");
    }

    return { curriculum };
};

export const getDepartmentCurriculumService = async ({ departmentId }: any) => {
    const curriculum = await prisma.curriculum.findMany({ where: { departmentId } });
    if (!curriculum) {
        throw new Error("Could not find curriculum for this department");
    }

    return { curriculum };
};

export const getAllUploadedCurriculumService = async () => {
    const curriculum = await prisma.curriculum.findMany();
    if (!curriculum) {
        throw new Error("No curriculum found");
    }

    return { curriculum }
};

export const getDepartmentSyllabiService = async ({ departmentId }: any) => {
    const syllabi = await prisma.syllabus.findMany({ where: { departmentId } });
    return { syllabi };
};

export const getSyllabusByIdService = async ({ id }: any) => {
    const syllabus = await prisma.syllabus.findUnique({ where: { id } });
    if (!syllabus) {
        throw new Error("Syllabus not found");
    }
    return { syllabus };
};