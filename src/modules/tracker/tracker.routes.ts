import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { allow, AuthRequest, protect } from "../../shared/middleware/auth.middleware";
import { asyncHandler } from "../../shared/async-handler";
import { DisputeStatus, Role } from "../../generated/prisma/enums";

const router = Router();
router.use(protect);

const percent = (done: number, total: number) => total ? Math.round(done / total * 100) : 0;

router.get("/departments", allow(Role.ADMIN), asyncHandler(async (_req, res) => {
  const rows = await prisma.department.findMany({
    include: { users: { where: { role: Role.INSTRUCTOR, isActive: true }, include: { _count: { select: { cohorts: { where: { isActive: true } } } } } }, curriculum: true, cohorts: { include: { progress: true } } },
    orderBy: { name: "asc" }
  });
  res.json(rows.map(d => ({ id: d.id, name: d.name, instructorCount: d.users.length, cohortCount: d.cohorts.length, topicCount: d.curriculum.length, progress: percent(d.cohorts.reduce((n, c) => n + c.progress.length, 0), d.cohorts.length * d.curriculum.length), instructors: d.users.map(i => ({ id: i.id, name: i.name, activeCohorts: i._count.cohorts })) })));
}));

router.post("/departments", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Department name is required" });

  const department = await prisma.department.create({ data: { name } });
  res.status(201).json(department);
}));

router.get("/departments/:id", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id }, include: { curriculum: { orderBy: { position: "asc" } }, cohorts: { where: { isActive: true }, include: { progress: true, instructor: { select: { id: true, name: true, isActive: true } }, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } }, users: { where: { role: Role.INSTRUCTOR, isActive: true }, include: { cohorts: { where: { isActive: true }, include: { progress: true, _count: { select: { enrollments: true } } } } } } } });
  if (!department) return res.status(404).json({ message: "Department not found" });
  res.json({ ...department, cohorts: department.cohorts.map(c => ({ ...c, progressPercent: percent(c.progress.length, department.curriculum.length) })), users: department.users.map(i => ({ ...i, password: undefined, cohorts: i.cohorts.map(c => ({ ...c, progressPercent: percent(c.progress.length, department.curriculum.length) })) })) });
}));

router.put("/departments/:id/curriculum", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const items = (req.body.items || []).filter((x: any) => x.title?.trim());
  if (!items.length) return res.status(400).json({ message: "Add at least one curriculum topic" });

  const recordedProgress = await prisma.progress.count({
    where: { cohort: { departmentId: String(req.params.id) } }
  });
  if (recordedProgress > 0) {
    return res.status(409).json({
      message: "This curriculum already has recorded progress and cannot be replaced."
    });
  }

  await prisma.$transaction([prisma.curriculumItem.deleteMany({ where: { departmentId: req.params.id } }), ...items.map((x: any, position: number) => prisma.curriculumItem.create({ data: { departmentId: req.params.id, title: x.title.trim(), description: x.description, position } }))]);
  res.json(await prisma.curriculumItem.findMany({ where: { departmentId: req.params.id }, orderBy: { position: "asc" } }));
}));

router.get("/instructors", allow(Role.ADMIN), asyncHandler(async (_req, res) => {
  // Deactivated instructors are included so the admin can review and reactivate
  // them; the client filters by `isActive`. Cohort assignment lists still come
  // from the /departments endpoints, which stay active-only.
  const users = await prisma.user.findMany({ where: { role: Role.INSTRUCTOR }, include: { department: true, _count: { select: { cohorts: { where: { isActive: true } } } } }, orderBy: { name: "asc" } });
  res.json(users.map(({ password, ...u }) => ({ ...u, activeCohorts: u._count.cohorts })));
}));

router.post("/instructors", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const { name, username, password, departmentId, email } = req.body;
  if (!name || !username || !password || !departmentId) return res.status(400).json({ message: "Name, username, password and department are required" });
  const normalizedUsername = username.trim().toLowerCase();
  // Must be case-insensitive: legacy rows can hold mixed-case usernames, and a
  // case-sensitive findUnique misses them — creating a second account instead of
  // reactivating the deactivated one, which then shadows it at login.
  const existing = await prisma.user.findFirst({ where: { username: { equals: normalizedUsername, mode: "insensitive" } } });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing?.isActive) return res.status(409).json({ message: "That username is already in use" });
  if (existing && existing.role !== Role.INSTRUCTOR) return res.status(409).json({ message: "That username belongs to another account" });

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { username: normalizedUsername, name: name.trim(), email: email?.trim() || null, password: hashedPassword, departmentId, isActive: true } })
    : await prisma.user.create({ data: { name: name.trim(), username: normalizedUsername, email: email?.trim() || null, password: hashedPassword, departmentId, role: Role.INSTRUCTOR } });
  res.status(201).json({ ...user, password: undefined });
}));

router.delete("/instructors/:id", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const instructor = await prisma.user.findFirst({
    where: { id: String(req.params.id), role: Role.INSTRUCTOR, isActive: true }
  });
  if (!instructor) return res.status(404).json({ message: "Instructor not found" });

  await prisma.$transaction([
    prisma.cohort.updateMany({ where: { instructorId: instructor.id, isActive: true }, data: { instructorId: null } }),
    prisma.user.update({ where: { id: instructor.id }, data: { isActive: false } })
  ]);
  res.status(204).send();
}));

router.patch("/instructors/:id/reactivate", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const instructor = await prisma.user.findFirst({
    where: { id: String(req.params.id), role: Role.INSTRUCTOR }
  });
  if (!instructor) return res.status(404).json({ message: "Instructor not found" });
  if (instructor.isActive) return res.status(409).json({ message: "That instructor is already active" });

  // Their existing password and department are untouched, so they can sign in
  // immediately. Cohorts unassigned at deactivation stay unassigned — an admin
  // reassigns those deliberately from the department page.
  const user = await prisma.user.update({ where: { id: instructor.id }, data: { isActive: true } });
  res.json({ ...user, password: undefined });
}));

router.patch("/cohorts/:id/instructor", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const cohort = await prisma.cohort.findUnique({ where: { id: String(req.params.id) } });
  if (!cohort || !cohort.isActive) return res.status(404).json({ message: "Active cohort not found" });

  const instructor = await prisma.user.findFirst({
    where: { id: req.body.instructorId, role: Role.INSTRUCTOR, isActive: true, departmentId: cohort.departmentId }
  });
  if (!instructor) return res.status(400).json({ message: "Choose an active instructor from this department" });

  const updated = await prisma.cohort.update({
    where: { id: cohort.id },
    data: { instructorId: instructor.id },
    include: { instructor: { select: { id: true, name: true } } }
  });
  res.json(updated);
}));

router.get("/instructor/cohorts", allow(Role.INSTRUCTOR), asyncHandler(async (req: AuthRequest, res) => {
  const cohorts = await prisma.cohort.findMany({ where: { instructorId: req.user!.id }, include: { department: { include: { curriculum: { orderBy: { position: "asc" } } } }, progress: true, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } });
  res.json(cohorts.map(c => ({ ...c, curriculum: c.department.curriculum.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) })), progressPercent: percent(c.progress.length, c.department.curriculum.length) })));
}));

router.post("/instructor/cohorts", allow(Role.INSTRUCTOR), asyncHandler(async (req: AuthRequest, res) => {
  const instructor = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!instructor?.isActive) return res.status(403).json({ message: "This instructor account is inactive" });
  if (!instructor.departmentId) return res.status(400).json({ message: "Instructor has no assigned department" });

  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Cohort name is required" });
  const existingCohort = await prisma.cohort.findFirst({
    where: { departmentId: instructor.departmentId, name: { equals: name, mode: "insensitive" } }
  });
  if (existingCohort) {
    return res.status(409).json({
      message: "A cohort with this name already exists in your department. Use a different name or ask an admin to reassign the existing cohort."
    });
  }

  const cohort = await prisma.cohort.create({ data: { name, departmentId: instructor.departmentId, instructorId: instructor.id } });
  res.status(201).json(cohort);
}));

router.post("/instructor/cohorts/:cohortId/students", allow(Role.INSTRUCTOR), asyncHandler(async (req: AuthRequest, res) => {
  const cohort = await prisma.cohort.findFirst({ where: { id: String(req.params.cohortId), instructorId: req.user!.id } });
  if (!cohort) return res.status(404).json({ message: "Cohort not found" });
  const studentLogin = req.body.username?.trim();
  if (!studentLogin) return res.status(400).json({ message: "Enter a student username or email" });

  const student = await prisma.user.findFirst({
    where: {
      role: Role.STUDENT,
      isActive: true,
      OR: [
        { username: { equals: studentLogin, mode: "insensitive" } },
        { email: { equals: studentLogin, mode: "insensitive" } }
      ]
    }
  });
  if (!student) return res.status(404).json({ message: "No registered student matches that username or email" });
  if (student.departmentId && student.departmentId !== cohort.departmentId) return res.status(400).json({ message: "Student belongs to another department" });
  if (!student.departmentId) await prisma.user.update({ where: { id: student.id }, data: { departmentId: cohort.departmentId } });
  const enrollment = await prisma.enrollment.upsert({ where: { cohortId_studentId: { cohortId: cohort.id, studentId: student.id } }, update: {}, create: { cohortId: cohort.id, studentId: student.id } });
  res.status(201).json(enrollment);
}));

router.put("/instructor/cohorts/:cohortId/progress/:itemId", allow(Role.INSTRUCTOR), asyncHandler(async (req: AuthRequest, res) => {
  const cohortId = String(req.params.cohortId);
  const itemId = String(req.params.itemId);
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, instructorId: req.user!.id } });
  if (!cohort) return res.status(404).json({ message: "Cohort not found" });
  if (req.body.completed) await prisma.progress.upsert({ where: { cohortId_curriculumItemId: { cohortId: cohort.id, curriculumItemId: itemId } }, create: { cohortId: cohort.id, curriculumItemId: itemId }, update: { completedAt: new Date() } });
  else await prisma.progress.deleteMany({ where: { cohortId: cohort.id, curriculumItemId: itemId } });
  res.status(204).send();
}));

router.get("/student/progress", allow(Role.STUDENT), asyncHandler(async (req: AuthRequest, res) => {
  const enrollment = await prisma.enrollment.findFirst({ where: { studentId: req.user!.id, cohort: { isActive: true } }, include: { cohort: { include: { department: { include: { curriculum: { orderBy: { position: "asc" } } } }, progress: true, instructor: { select: { name: true } } } } } });
  if (!enrollment) return res.json(null);
  const c = enrollment.cohort;
  res.json({ cohort: { id: c.id, name: c.name, department: c.department.name, instructor: c.instructor?.name || "Awaiting instructor assignment" }, progressPercent: percent(c.progress.length, c.department.curriculum.length), curriculum: c.department.curriculum.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) })) });
}));

router.post("/student/disputes", allow(Role.STUDENT), asyncHandler(async (req: AuthRequest, res) => {
  const enrolled = await prisma.enrollment.findFirst({ where: { studentId: req.user!.id, cohortId: req.body.cohortId } });
  if (!enrolled) return res.status(403).json({ message: "You are not enrolled in this cohort" });
  const dispute = await prisma.dispute.create({ data: { studentId: req.user!.id, cohortId: req.body.cohortId, curriculumItemId: req.body.curriculumItemId, reason: req.body.reason } });
  res.status(201).json(dispute);
}));

router.get("/disputes", allow(Role.ADMIN), asyncHandler(async (_req, res) => {
  res.json(await prisma.dispute.findMany({ include: { student: { select: { name: true } }, cohort: { include: { department: true, instructor: { select: { name: true } } } }, curriculumItem: true }, orderBy: { createdAt: "desc" } }));
}));

router.patch("/disputes/:id/resolve", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  res.json(await prisma.dispute.update({ where: { id: req.params.id }, data: { status: DisputeStatus.RESOLVED, resolvedAt: new Date() } }));
}));

export default router;
