import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import trackerRoutes from "./modules/tracker/tracker.routes.js";
const app = express();
app.use(cors());
// Above the 100 kb default because an uploaded picture passes through this API as
// base64 in the JSON body on its way to the storage bucket. The headroom is
// deliberate: an oversized one should get `readAvatarUpload`'s 400 naming the
// limit, not Express's bare 413.
app.use(express.json({ limit: "256kb" }));
app.use(helmet());
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use("/api/me", profileRoutes);
app.use("/api", trackerRoutes);
app.use((err, _req, res, _next) => {
    const status = err.status ?? (err.code === "P2002" ? 409 : 500);
    // Expected rejections (a taken username, a deactivated account) are not server
    // faults — only log the ones that actually are.
    if (status >= 500)
        console.error(err);
    res.status(status).json({ message: err.code === "P2002" ? "That value already exists" : err.message || "Server error" });
});
export default app;
