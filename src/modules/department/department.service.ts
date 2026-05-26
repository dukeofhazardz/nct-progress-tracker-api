import { prisma } from "../../lib/prisma";

export const createDepartmentService = async ({name}: any) => {
    const existingDepartment = await prisma.department.findUnique({ where: { name } });
    if (existingDepartment) {
        throw new Error("Department with this name already exists");
    }

    const department = await prisma.department.create({
        data: {
            name,
        },
    });

    return { department, message: "Department created successfully" };
};

export const getDepartmentService = async ({ id }: any) => {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
        throw new Error("Could not find department");
    }

    return { department };
};

export const getDepartmentsService = async () => {
    const departments = await prisma.department.findMany()
    if (!departments) {
        throw new Error("No departments found");
    }

    return { departments };
};