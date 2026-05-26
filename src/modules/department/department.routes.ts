import { Router } from "express";
import * as controller from "./department.controller";
import * as authMiddleware from "../../shared/middleware/auth.middleware";
import * as adminMiddleware from "../../shared/middleware/admin.middleware";

const router = Router();

router.post("/", authMiddleware.protect, adminMiddleware.protect, controller.createDepartmentController);
router.get("/:id", authMiddleware.protect, controller.getDepartmentController);
router.get("/", authMiddleware.protect, controller.getDepartmentsController);

export default router;