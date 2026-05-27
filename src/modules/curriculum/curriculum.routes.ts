import { Router } from "express";
import * as controller from "./curriculum.controller";
import * as authMiddleware from "../../shared/middleware/auth.middleware";
import * as adminMiddleware from "../../shared/middleware/admin.middleware";
import { upload } from "../../config/multer.config";

const router = Router();

router.post("/", authMiddleware.protect, adminMiddleware.protect, upload.single("file"), controller.uploadCurriculumController);
router.get("/:id", authMiddleware.protect, controller.getUploadedCurriculumController);
router.get("/department/:departmentId", authMiddleware.protect, controller.getDepartmentCurriculumController);
router.get("/", authMiddleware.protect, controller.getAllUploadedCurriculumController);


export default router;