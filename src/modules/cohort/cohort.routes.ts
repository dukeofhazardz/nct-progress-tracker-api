import { Router } from "express";
import * as controller from "./cohort.controller";
import * as authMiddleware from "../../shared/middleware/auth.middleware";
import * as adminMiddleware from "../../shared/middleware/admin.middleware";

const router = Router();

router.post("/", authMiddleware.protect, adminMiddleware.protect, controller.createCohortController);
router.get("/:id", authMiddleware.protect, controller.getCohortController);
router.get("/", authMiddleware.protect, controller.getCohortsController);


export default router;