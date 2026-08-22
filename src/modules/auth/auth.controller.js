import * as authService from "./auth.service.js";
export const register = async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json(user);
};
export const login = async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
};
