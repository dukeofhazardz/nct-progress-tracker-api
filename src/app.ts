import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes";
import departmentRoutes from "./modules/department/department.routes";
import cohortRoutes from "./modules/cohort/cohort.routes";
import curriculumRoutes from "./modules/curriculum/curriculum.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/cohort", cohortRoutes);
app.use("/api/curriculum", curriculumRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? (err.code === "P2002" ? 409 : 500);

  // Expected rejections (a taken username, a deactivated account) are not server
  // faults — only log the ones that actually are.
  if (status >= 500) console.error(err);

  res.status(status).json({ message: err.code === "P2002" ? "That value already exists" : err.message || "Server error" });
});

export default app;
