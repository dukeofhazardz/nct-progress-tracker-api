import { prisma } from "../../lib/prisma";
export const createCohortService = async ({ name, instructorId, departmentId }) => {
    const existingCohort = await prisma.cohort.findUnique({ where: { name } });
    if (existingCohort) {
        throw new Error("Cohort with this name already exists");
    }
    const cohort = await prisma.cohort.create({
        data: {
            name,
            instructorId,
            departmentId,
        },
    });
    return { cohort, message: "Cohort created successfully" };
};
export const getCohortService = async ({ id }) => {
    const cohort = await prisma.cohort.findUnique({ where: { id } });
    if (!cohort) {
        throw new Error("Could not find cohort");
    }
    return { cohort };
};
export const getCohortsService = async () => {
    const cohorts = await prisma.cohort.findMany();
    if (!cohorts) {
        throw new Error("No cohorts found");
    }
    return { cohorts };
};
