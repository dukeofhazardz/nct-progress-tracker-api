import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const conflict = (message) => {
    const error = new Error(message);
    error.status = 409;
    return error;
};
export const register = async (data) => {
    if (!data.username || !data.password || !data.name)
        throw new Error("Name, username and password are required");
    const username = data.username.trim().toLowerCase();
    // Case-insensitive so a mixed-case legacy row (e.g. "Israel") cannot be
    // sidestepped by registering "israel" and creating a second account that
    // then shadows the original at login.
    const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
    if (existing)
        throw conflict("That username is already taken");
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
        data: {
            username,
            email: data.email || null,
            name: data.name,
            role: "STUDENT",
            departmentId: data.departmentId || null,
            password: hashed
        }
    });
};
export const login = async ({ username, email, password }) => {
    const loginId = (username || email || "").trim();
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: { equals: loginId, mode: "insensitive" } },
                { email: { equals: loginId, mode: "insensitive" } }
            ]
        },
        // This match is case-insensitive, so it can hit more than one row where
        // legacy case-variant duplicates exist. Without an explicit order the row
        // returned is arbitrary — a deactivated twin could shadow the live account.
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: { department: true }
    });
    if (!user)
        throw new Error("User not found");
    if (!user.isActive) {
        // 403, not 500 — a deactivated account is an expected outcome, not a fault.
        // Deliberately not 401: axiosInstance hard-redirects to /login on any 401,
        // which would discard the message before the user could read it.
        const error = new Error("This account has been deactivated");
        error.status = 403;
        throw error;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
        throw new Error("Invalid password");
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role, departmentId: user.departmentId, dept: user.department?.name } };
};
