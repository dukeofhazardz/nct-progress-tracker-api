import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";
import { Role } from "../src/generated/prisma/enums.js";
const topics = ["HTML fundamentals", "CSS and responsive design", "JavaScript fundamentals", "Git and GitHub", "React fundamentals", "React state and hooks", "Working with APIs", "Node.js and Express", "Database fundamentals", "Authentication", "Testing", "Deployment"];
async function main() {
    const department = await prisma.department.upsert({ where: { name: "Web Development" }, update: {}, create: { name: "Web Development" } });
    if (await prisma.curriculumItem.count({ where: { departmentId: department.id } }) === 0) {
        await prisma.curriculumItem.createMany({ data: topics.map((title, position) => ({ departmentId: department.id, title, position })) });
    }
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    await prisma.user.upsert({ where: { username }, update: { role: Role.ADMIN }, create: { username, name: process.env.ADMIN_NAME || "System Administrator", password: await bcrypt.hash(password, 10), role: Role.ADMIN } });
    console.log(`Seed complete. Admin username: ${username}`);
    if (!process.env.ADMIN_PASSWORD)
        console.log("Development password: ChangeMe123! (change this immediately)");
}
main().finally(() => prisma.$disconnect());
