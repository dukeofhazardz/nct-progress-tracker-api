import { prisma } from "../../lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const register = async (data: any) => {
    const hashed = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
        data: {
            email: data.email,
            password: hashed
        }
    });
};

export const login = async ({ email, password }: any) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid password");

    return jwt.sign({ id: user.id }, process.env.JWT_SECRET!);
};