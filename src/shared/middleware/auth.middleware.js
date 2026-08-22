import jwt from "jsonwebtoken";
export const protect = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
export const allow = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ message: "You do not have permission to perform this action" });
        return;
    }
    next();
};
