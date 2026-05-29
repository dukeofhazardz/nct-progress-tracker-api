export const protect = (req, res, next) => {
    if (req.user && req.user.id === "admin") {
        return next();
    }
    else {
        return res.status(403).json({ message: "Forbidden: Admins only" });
    }
};
