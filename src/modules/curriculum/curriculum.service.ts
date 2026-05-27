import { prisma } from "../../lib/prisma";

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