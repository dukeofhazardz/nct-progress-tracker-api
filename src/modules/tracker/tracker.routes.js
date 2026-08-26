import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { allow, protect } from "../../shared/middleware/auth.middleware.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { DisputeStatus, Role } from "../../generated/prisma/enums.js";
const router = Router();
// Public on purpose: the registration form needs department names before the
// student has an account. Ids and names only — nothing else is exposed here.
router.get("/public/departments", asyncHandler(async (_req, res) => {
    res.json(await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }));
}));
router.use(protect);
const percent = (done, total) => total ? Math.round(done / total * 100) : 0;
const MANAGERS = [Role.ADMIN, Role.HOD];
/**
 * The departments a caller may act on. `null` means unrestricted (ADMIN); an
 * array means the caller is a HOD and may only touch these.
 *
 * Out-of-scope resources are reported as 404 rather than 403 throughout, so a
 * HOD cannot use error codes to discover which other departments exist.
 */
const scopeOf = async (user) => user.role === Role.ADMIN
    ? null
    : (await prisma.departmentMember.findMany({ where: { userId: user.id }, select: { departmentId: true } })).map(m => m.departmentId);
const inScope = (scope, departmentId) => !scope || (departmentId !== null && scope.includes(departmentId));
router.get("/departments", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const scope = await scopeOf(req.user);
    const rows = await prisma.department.findMany({
        where: scope ? { id: { in: scope } } : {},
        include: { users: { where: { role: Role.INSTRUCTOR, isActive: true }, include: { _count: { select: { cohorts: { where: { isActive: true } } } } } }, curriculum: true, cohorts: { include: { progress: true } } },
        orderBy: { name: "asc" }
    });
    res.json(rows.map(d => ({ id: d.id, name: d.name, instructorCount: d.users.length, cohortCount: d.cohorts.length, completedCohortCount: d.cohorts.filter(c => c.completedAt).length, topicCount: d.curriculum.length, progress: percent(d.cohorts.reduce((n, c) => n + c.progress.length, 0), d.cohorts.length * d.curriculum.length), instructors: d.users.map(i => ({ id: i.id, name: i.name, activeCohorts: i._count.cohorts })) })));
}));
// Creating departments stays with the administrator — a HOD administers the
// departments they already head, but cannot mint new ones.
router.post("/departments", allow(Role.ADMIN), asyncHandler(async (req, res) => {
    const name = req.body.name?.trim();
    if (!name)
        return res.status(400).json({ message: "Department name is required" });
    const department = await prisma.department.create({ data: { name } });
    res.status(201).json(department);
}));
router.get("/departments/:id", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const departmentId = String(req.params.id);
    const scope = await scopeOf(req.user);
    if (!inScope(scope, departmentId))
        return res.status(404).json({ message: "Department not found" });
    const department = await prisma.department.findUnique({ where: { id: departmentId }, include: { curriculum: { orderBy: { position: "asc" } }, cohorts: { where: { isActive: true }, include: { progress: true, instructor: { select: { id: true, name: true, isActive: true } }, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } }, users: { where: { role: Role.INSTRUCTOR, isActive: true }, include: { cohorts: { where: { isActive: true }, include: { progress: true, _count: { select: { enrollments: true } } } } } } } });
    if (!department)
        return res.status(404).json({ message: "Department not found" });
    res.json({ ...department, cohorts: department.cohorts.map(c => ({ ...c, progressPercent: percent(c.progress.length, department.curriculum.length) })), users: department.users.map(i => ({ ...i, password: undefined, cohorts: i.cohorts.map(c => ({ ...c, progressPercent: percent(c.progress.length, department.curriculum.length) })) })) });
}));
router.put("/departments/:id/curriculum", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const departmentId = String(req.params.id);
    const scope = await scopeOf(req.user);
    if (!inScope(scope, departmentId))
        return res.status(404).json({ message: "Department not found" });
    const items = (req.body.items || []).filter((x) => x.title?.trim());
    if (!items.length)
        return res.status(400).json({ message: "Add at least one curriculum topic" });
    const recordedProgress = await prisma.progress.count({
        where: { cohort: { departmentId } }
    });
    if (recordedProgress > 0) {
        return res.status(409).json({
            message: "This curriculum already has recorded progress and cannot be replaced."
        });
    }
    await prisma.$transaction([prisma.curriculumItem.deleteMany({ where: { departmentId } }), ...items.map((x, position) => prisma.curriculumItem.create({ data: { departmentId, title: x.title.trim(), description: x.description, position } }))]);
    res.json(await prisma.curriculumItem.findMany({ where: { departmentId }, orderBy: { position: "asc" } }));
}));
/**
 * Staff accounts — instructors and heads of department. Both are created,
 * deactivated and reactivated identically, so they share one set of routes.
 *
 * An instructor's department is `User.departmentId` (cohort creation depends on
 * it); a HOD's departments are `DepartmentMember` rows. Every response
 * normalises both into a `departments` array so the client renders one shape.
 */
const staffDepartments = (user) => user.role === Role.HOD
    ? user.memberOf.map(m => m.department)
    : user.department ? [user.department] : [];
router.get("/staff", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const scope = await scopeOf(req.user);
    // Deactivated accounts are included so they can be reviewed and reactivated;
    // the client filters by `isActive`. A HOD sees only instructors in their own
    // departments — head-of-department accounts are the administrator's to manage.
    const users = await prisma.user.findMany({
        where: scope ? { role: Role.INSTRUCTOR, departmentId: { in: scope } } : { role: { in: [Role.INSTRUCTOR, Role.HOD] } },
        include: { department: { select: { id: true, name: true } }, memberOf: { include: { department: { select: { id: true, name: true } } } }, _count: { select: { cohorts: { where: { isActive: true } } } } },
        orderBy: { name: "asc" }
    });
    res.json(users.map(({ password, memberOf, ...u }) => ({ ...u, activeCohorts: u._count.cohorts, departments: staffDepartments({ ...u, memberOf }) })));
}));
router.post("/staff", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const { name, username, password, email } = req.body;
    const role = req.body.role === Role.HOD ? Role.HOD : Role.INSTRUCTOR;
    if (!name?.trim() || !username?.trim() || !password)
        return res.status(400).json({ message: "Name, username and password are required" });
    const scope = await scopeOf(req.user);
    if (scope && role !== Role.INSTRUCTOR)
        return res.status(403).json({ message: "Only an administrator can create head-of-department accounts" });
    const departmentIds = role === Role.HOD
        ? [...new Set((req.body.departmentIds || []).filter(Boolean))]
        : [req.body.departmentId].filter(Boolean);
    if (!departmentIds.length)
        return res.status(400).json({ message: role === Role.HOD ? "Select at least one department" : "Department is required" });
    if (scope && departmentIds.some(id => !inScope(scope, id)))
        return res.status(404).json({ message: "Department not found" });
    if (await prisma.department.count({ where: { id: { in: departmentIds } } }) !== departmentIds.length)
        return res.status(400).json({ message: "One or more of those departments do not exist" });
    const normalizedUsername = username.trim().toLowerCase();
    // Must be case-insensitive: legacy rows can hold mixed-case usernames, and a
    // case-sensitive findUnique misses them — creating a second account instead of
    // reactivating the deactivated one, which then shadows it at login.
    const existing = await prisma.user.findFirst({ where: { username: { equals: normalizedUsername, mode: "insensitive" } } });
    if (existing?.isActive)
        return res.status(409).json({ message: "That username is already in use" });
    if (existing && existing.role !== role)
        return res.status(409).json({ message: "That username belongs to another account" });
    if (existing && scope && !inScope(scope, existing.departmentId))
        return res.status(404).json({ message: "Account not found" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const fields = { name: name.trim(), email: email?.trim() || null, password: hashedPassword, departmentId: role === Role.INSTRUCTOR ? departmentIds[0] : null };
    const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { ...fields, username: normalizedUsername, isActive: true } })
        : await prisma.user.create({ data: { ...fields, username: normalizedUsername, role } });
    // Memberships drive scoping, so they are brought exactly into line with the
    // submitted set on both create and reactivate.
    await prisma.$transaction([
        prisma.departmentMember.deleteMany({ where: { userId: user.id, departmentId: { notIn: departmentIds } } }),
        ...departmentIds.map(departmentId => prisma.departmentMember.upsert({ where: { userId_departmentId: { userId: user.id, departmentId } }, create: { userId: user.id, departmentId }, update: {} }))
    ]);
    res.status(201).json({ ...user, password: undefined });
}));
/** Shared authorisation for acting on one staff account. */
const findManageableStaff = async (req, where) => {
    const target = await prisma.user.findFirst({ where: { id: String(req.params.id), role: { in: [Role.INSTRUCTOR, Role.HOD] }, ...where } });
    if (!target)
        return null;
    const scope = await scopeOf(req.user);
    // A HOD may act on instructors in their own departments, never on another HOD.
    if (scope && (target.role !== Role.INSTRUCTOR || !inScope(scope, target.departmentId)))
        return null;
    return target;
};
router.delete("/staff/:id", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const target = await findManageableStaff(req, { isActive: true });
    if (!target)
        return res.status(404).json({ message: "Account not found" });
    // Memberships are left in place so reactivating restores the account exactly.
    await prisma.$transaction([
        prisma.cohort.updateMany({ where: { instructorId: target.id, isActive: true }, data: { instructorId: null } }),
        prisma.user.update({ where: { id: target.id }, data: { isActive: false } })
    ]);
    res.status(204).send();
}));
router.patch("/staff/:id/reactivate", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const target = await findManageableStaff(req, {});
    if (!target)
        return res.status(404).json({ message: "Account not found" });
    if (target.isActive)
        return res.status(409).json({ message: "That account is already active" });
    // Their existing password and departments are untouched, so they can sign in
    // immediately. Cohorts unassigned at deactivation stay unassigned — an admin
    // or HOD reassigns those deliberately from the department page.
    const user = await prisma.user.update({ where: { id: target.id }, data: { isActive: true } });
    res.json({ ...user, password: undefined });
}));
router.patch("/cohorts/:id/instructor", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const cohort = await prisma.cohort.findUnique({ where: { id: String(req.params.id) } });
    if (!cohort || !cohort.isActive)
        return res.status(404).json({ message: "Active cohort not found" });
    const scope = await scopeOf(req.user);
    if (!inScope(scope, cohort.departmentId))
        return res.status(404).json({ message: "Active cohort not found" });
    const instructor = await prisma.user.findFirst({
        where: { id: req.body.instructorId, role: Role.INSTRUCTOR, isActive: true, departmentId: cohort.departmentId }
    });
    if (!instructor)
        return res.status(400).json({ message: "Choose an active instructor from this department" });
    const updated = await prisma.cohort.update({
        where: { id: cohort.id },
        data: { instructorId: instructor.id },
        include: { instructor: { select: { id: true, name: true } } }
    });
    res.json(updated);
}));
/** Cohort roster. Read-only: enrolling is the instructor's job, and nothing here removes a student. */
router.get("/cohorts/:id/students", allow(Role.ADMIN, Role.HOD, Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohort = await prisma.cohort.findUnique({ where: { id: String(req.params.id) } });
    const notFound = () => res.status(404).json({ message: "Cohort not found" });
    if (!cohort)
        return notFound();
    if (req.user.role === Role.INSTRUCTOR) {
        if (cohort.instructorId !== req.user.id)
            return notFound();
    }
    else if (!inScope(await scopeOf(req.user), cohort.departmentId)) {
        return notFound();
    }
    const enrollments = await prisma.enrollment.findMany({
        where: { cohortId: cohort.id },
        include: { student: { select: { id: true, name: true, username: true, email: true, isActive: true } } },
        orderBy: { student: { name: "asc" } }
    });
    res.json(enrollments.map(e => ({ ...e.student, enrolledAt: e.createdAt })));
}));
router.get("/instructor/cohorts", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohorts = await prisma.cohort.findMany({ where: { instructorId: req.user.id }, include: { department: { include: { curriculum: { orderBy: { position: "asc" } } } }, progress: true, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } });
    res.json(cohorts.map(c => ({ ...c, curriculum: c.department.curriculum.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) })), progressPercent: percent(c.progress.length, c.department.curriculum.length) })));
}));
router.post("/instructor/cohorts", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const instructor = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!instructor?.isActive)
        return res.status(403).json({ message: "This instructor account is inactive" });
    if (!instructor.departmentId)
        return res.status(400).json({ message: "Instructor has no assigned department" });
    const name = req.body.name?.trim();
    if (!name)
        return res.status(400).json({ message: "Cohort name is required" });
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
router.post("/instructor/cohorts/:cohortId/students", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohort = await prisma.cohort.findFirst({ where: { id: String(req.params.cohortId), instructorId: req.user.id } });
    if (!cohort)
        return res.status(404).json({ message: "Cohort not found" });
    const studentLogin = req.body.username?.trim();
    if (!studentLogin)
        return res.status(400).json({ message: "Enter a student username or email" });
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
    if (!student)
        return res.status(404).json({ message: "No registered student matches that username or email" });
    // Students take courses in more than one department, so enrolling one into a
    // cohort outside the departments they registered for simply records that
    // department rather than refusing. `User.departmentId` is left alone — for
    // students, DepartmentMember is now the authoritative set.
    await prisma.departmentMember.upsert({
        where: { userId_departmentId: { userId: student.id, departmentId: cohort.departmentId } },
        create: { userId: student.id, departmentId: cohort.departmentId },
        update: {}
    });
    const enrollment = await prisma.enrollment.upsert({ where: { cohortId_studentId: { cohortId: cohort.id, studentId: student.id } }, update: {}, create: { cohortId: cohort.id, studentId: student.id } });
    res.status(201).json(enrollment);
}));
router.put("/instructor/cohorts/:cohortId/progress/:itemId", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohortId = String(req.params.cohortId);
    const itemId = String(req.params.itemId);
    const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, instructorId: req.user.id } });
    if (!cohort)
        return res.status(404).json({ message: "Cohort not found" });
    // A completed cohort is frozen, otherwise unticking a topic would leave it
    // marked complete while sitting below 100%.
    if (cohort.completedAt)
        return res.status(409).json({ message: "This cohort is marked completed. Reopen it before changing recorded progress." });
    if (req.body.completed)
        await prisma.progress.upsert({ where: { cohortId_curriculumItemId: { cohortId: cohort.id, curriculumItemId: itemId } }, create: { cohortId: cohort.id, curriculumItemId: itemId }, update: { completedAt: new Date() } });
    else
        await prisma.progress.deleteMany({ where: { cohortId: cohort.id, curriculumItemId: itemId } });
    res.status(204).send();
}));
/**
 * Mark delivery finished. Whether every topic is covered is re-checked here
 * rather than trusted from the client, which only hides the button.
 */
router.patch("/instructor/cohorts/:cohortId/complete", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohort = await prisma.cohort.findFirst({
        where: { id: String(req.params.cohortId), instructorId: req.user.id },
        include: { department: { include: { curriculum: { select: { id: true } } } }, progress: { select: { curriculumItemId: true } } }
    });
    if (!cohort)
        return res.status(404).json({ message: "Cohort not found" });
    if (cohort.completedAt)
        return res.status(409).json({ message: "This cohort is already marked completed" });
    const topicIds = cohort.department.curriculum.map(item => item.id);
    if (!topicIds.length)
        return res.status(400).json({ message: "This department has no published curriculum yet" });
    const covered = new Set(cohort.progress.map(p => p.curriculumItemId));
    const remaining = topicIds.filter(id => !covered.has(id)).length;
    if (remaining > 0)
        return res.status(400).json({ message: `${remaining} ${remaining === 1 ? "topic has" : "topics have"} not been covered yet` });
    res.json(await prisma.cohort.update({ where: { id: cohort.id }, data: { completedAt: new Date() } }));
}));
router.patch("/instructor/cohorts/:cohortId/reopen", allow(Role.INSTRUCTOR), asyncHandler(async (req, res) => {
    const cohort = await prisma.cohort.findFirst({ where: { id: String(req.params.cohortId), instructorId: req.user.id } });
    if (!cohort)
        return res.status(404).json({ message: "Cohort not found" });
    if (!cohort.completedAt)
        return res.status(409).json({ message: "This cohort is not marked completed" });
    // Recorded progress is untouched, so reopening and completing again is lossless.
    res.json(await prisma.cohort.update({ where: { id: cohort.id }, data: { completedAt: null } }));
}));
/**
 * Every active course the student is enrolled in. Returns an array because a
 * student can register for more than one department; an empty array means they
 * are not in any active cohort yet.
 */
router.get("/student/progress", allow(Role.STUDENT), asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id, cohort: { isActive: true } },
        include: { cohort: { include: { department: { include: { curriculum: { orderBy: { position: "asc" } } } }, progress: true, instructor: { select: { name: true } } } } }
    });
    res.json(enrollments
        .map(({ cohort: c }) => ({
        cohort: { id: c.id, name: c.name, department: c.department.name, instructor: c.instructor?.name || "Awaiting instructor assignment", completedAt: c.completedAt },
        progressPercent: percent(c.progress.length, c.department.curriculum.length),
        curriculum: c.department.curriculum.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) }))
    }))
        .sort((a, b) => a.cohort.department.localeCompare(b.cohort.department)));
}));
router.post("/student/disputes", allow(Role.STUDENT), asyncHandler(async (req, res) => {
    const enrolled = await prisma.enrollment.findFirst({ where: { studentId: req.user.id, cohortId: req.body.cohortId } });
    if (!enrolled)
        return res.status(403).json({ message: "You are not enrolled in this cohort" });
    const dispute = await prisma.dispute.create({ data: { studentId: req.user.id, cohortId: req.body.cohortId, curriculumItemId: req.body.curriculumItemId, reason: req.body.reason } });
    res.status(201).json(dispute);
}));
router.get("/disputes", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const scope = await scopeOf(req.user);
    res.json(await prisma.dispute.findMany({
        where: scope ? { cohort: { departmentId: { in: scope } } } : {},
        include: { student: { select: { name: true } }, cohort: { include: { department: true, instructor: { select: { name: true } } } }, curriculumItem: true },
        orderBy: { createdAt: "desc" }
    }));
}));
router.patch("/disputes/:id/resolve", allow(...MANAGERS), asyncHandler(async (req, res) => {
    const dispute = await prisma.dispute.findUnique({ where: { id: String(req.params.id) }, include: { cohort: { select: { departmentId: true } } } });
    if (!dispute)
        return res.status(404).json({ message: "Dispute not found" });
    const scope = await scopeOf(req.user);
    if (!inScope(scope, dispute.cohort.departmentId))
        return res.status(404).json({ message: "Dispute not found" });
    res.json(await prisma.dispute.update({ where: { id: dispute.id }, data: { status: DisputeStatus.RESOLVED, resolvedAt: new Date() } }));
}));
export default router;
