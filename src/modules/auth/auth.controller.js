import "dotenv/config";
import jwt from "jsonwebtoken";
import axios from "axios";
import { registerInstructorService, loginInstructorService } from "./auth.service";
export const studentLoginController = async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }
    const response = await axios.post("https://portal.neocloud.ng/api/login", {
        username,
        password,
    });
    if (response.status !== 200) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const responseData = response.data;
    const token = jwt.sign({ id: responseData.access_id }, process.env.JWT_SECRET);
    return res.json({ token });
};
export const adminLoginController = async (req, res) => {
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid admin credentials" });
    }
    const token = jwt.sign({ id: "admin" }, process.env.JWT_SECRET);
    return res.json({ token });
};
export const instructorRegisterController = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const response = await registerInstructorService({ firstName, lastName, email, password });
    return res.status(201).json(response);
};
export const instructorLoginController = async (req, res) => {
    const { email, password } = req.body;
    const token = await loginInstructorService({ email, password });
    return res.json({ token });
};
