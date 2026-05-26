import { Router } from "express";
import * as controller from "./auth.controller";

const router = Router();

router.post("/login", controller.studentLoginController);
router.post("/admin/login", controller.adminLoginController);
router.post("/instructor/register", controller.instructorRegisterController);
router.post("/instructor/login", controller.instructorLoginController);


export default router;