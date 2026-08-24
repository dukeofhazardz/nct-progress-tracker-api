import { prisma } from "../../lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
export const registerInstructorService = async (data) => {
    const hashed = await bcrypt.hash(data.password, 10);
    if (!hashed) {
        throw new Error("Error hashing password");
    }
    const existingInstructor = await prisma.instructor.findUnique({ where: { email: data.email } });
    if (existingInstructor) {
        throw new Error("Instructor with this email already exists");
    }
    const instructor = await prisma.instructor.create({
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashed,
        },
    });
    const token = jwt.sign({ id: instructor.id }, process.env.JWT_SECRET);
    const { password: _password, ...safeInstructor } = instructor;
    return { token, safeInstructor, message: "Instructor registered successfully" };
};
export const loginInstructorService = async ({ email, password }) => {
    const instructor = await prisma.instructor.findUnique({ where: { email } });
    if (!instructor) {
        throw new Error("Invalid instructor credentials");
    }
    const isMatch = await bcrypt.compare(password, instructor.password);
    if (!isMatch) {
        throw new Error("Invalid instructor credentials");
    }
    const token = jwt.sign({ id: instructor.id }, process.env.JWT_SECRET);
    return { token };
};
