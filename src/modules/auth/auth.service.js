import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { avatarUrlOf } from "../../shared/profile.js";
import { Role } from "../../generated/prisma/enums.js";
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
    // Students can take courses in several departments. This is what they say
    // they signed up for; it does not restrict enrolment, so it stays optional.
    const departmentIds = [...new Set((data.departmentIds || []).filter(Boolean))];
    if (departmentIds.length) {
        const found = await prisma.department.count({ where: { id: { in: departmentIds } } });
        if (found !== departmentIds.length) {
            const error = new Error("One or more of those departments do not exist");
            error.status = 400;
            throw error;
        }
    }
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
        data: {
            username,
            email: data.email || null,
            name: data.name,
            role: "STUDENT",
            departmentId: null,
            password: hashed,
            memberOf: { create: departmentIds.map(departmentId => ({ departmentId })) }
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
        include: { department: true, memberOf: { include: { department: { select: { id: true, name: true } } } } }
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
    // `departments` covers HODs (who head several) and students (who may study in
    // several); `dept` stays for the single-department instructor case the shell
    // already renders. `avatarUrl` rides along so the top bar and sidebar can render
    // a face straight from the stored session, with no extra request on every page —
    // the URL only, never the picture, which the browser fetches from the bucket.
    const departments = user.role === Role.INSTRUCTOR
        ? user.department ? [{ id: user.department.id, name: user.department.name }] : []
        : user.memberOf.map(m => m.department);
    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role, avatarUrl: avatarUrlOf(user.avatarPath), departmentId: user.departmentId, dept: user.department?.name, departments } };
};
