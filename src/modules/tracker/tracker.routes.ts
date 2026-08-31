import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { allow, AuthRequest, protect } from "../../shared/middleware/auth.middleware";
import { asyncHandler } from "../../shared/async-handler";
import { percent } from "../../shared/progress";
import { avatarUrlOf, profileOf, STAFF_FIELDS, staffDepartments } from "../../shared/profile";
import { DisputeStatus, Role } from "../../generated/prisma/enums";

const router = Router();

// Public on purpose: the registration form needs department names before the
// student has an account. Ids and names only — nothing else is exposed here.
router.get("/public/departments", asyncHandler(async (_req, res) => {
  res.json(await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }));
}));

router.use(protect);

const MANAGERS = [Role.ADMIN, Role.HOD] as const;

/**
 * The departments a caller may act on. `null` means unrestricted (ADMIN); an
 * array means the caller is a HOD and may only touch these.
 *
 * Out-of-scope resources are reported as 404 rather than 403 throughout, so a
 * HOD cannot use error codes to discover which other departments exist.
 */
const scopeOf = async (user: { id: string; role: Role }) =>
  user.role === Role.ADMIN
    ? null
    : (await prisma.departmentMember.findMany({ where: { userId: user.id }, select: { departmentId: true } })).map(m => m.departmentId);

const inScope = (scope: string[] | null, departmentId: string | null) =>
  !scope || (departmentId !== null && scope.includes(departmentId));

/**
 * Who may deliver a cohort in a department: its instructors, plus the heads who
 * head it — heading a department and teaching in it are not exclusive, and
 * `Cohort.instructor` has never carried a role constraint.
 *
 * An instructor's department is `User.departmentId` while a HOD's are
 * `DepartmentMember` rows, so the two cannot come from one relation query — which
 * is why `Department.users` alone is no longer the answer to this question.
 */
const canDeliverIn = (departmentId: string) => ({
  isActive: true,
  OR: [
    { role: Role.INSTRUCTOR, departmentId },
    { role: Role.HOD, memberOf: { some: { departmentId } } }
  ]
});

/**
 * A department's *current* curriculum is simply its highest version — spread this
 * into an `include` on `curriculumVersions`. Publishing appends a version rather
 * than editing topics, so a cohort already in progress keeps the list it began
 * with; see `topicsFor` for how the two are reconciled.
 */
const CURRENT_VERSION = { orderBy: { version: "desc" }, take: 1, include: { items: { orderBy: { position: "asc" } } } } as const;

/** The version a cohort has been pinned to, if any, with its topics in order. */
const PINNED_VERSION = { include: { items: { orderBy: { position: "asc" } } } } as const;

type Topic = { id: string; title: string; description: string | null; position: number };

/**
 * The topics a cohort delivers. A cohort is pinned the moment its instructor
 * records the first topic; until then it follows the department, which is what
 * lets a republish reach cohorts that have not started yet.
 *
 * Every read resolves the list this way rather than filtering versions itself, so
 * there is no version filter to forget.
 */
const topicsFor = (
  cohort: { curriculumVersion?: { items: Topic[] } | null },
  department: { curriculumVersions: { items: Topic[] }[] }
): Topic[] => cohort.curriculumVersion?.items ?? department.curriculumVersions[0]?.items ?? [];

router.get("/departments", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const scope = await scopeOf(req.user!);
  const [rows, deliverers] = await Promise.all([
    prisma.department.findMany({
      where: scope ? { id: { in: scope } } : {},
      // Counts only — this list never renders topic titles or progress rows.
      include: {
        curriculumVersions: { orderBy: { version: "desc" }, take: 1, select: { _count: { select: { items: true } } } },
        cohorts: { select: { completedAt: true, _count: { select: { progress: true } }, curriculumVersion: { select: { _count: { select: { items: true } } } } } }
      },
      orderBy: { name: "asc" }
    }),
    // Everyone who could be delivering in any in-scope department, fetched once
    // and grouped below. A HOD's departments are memberships, so this cannot be a
    // nested `users` include on the department.
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: Role.INSTRUCTOR, departmentId: scope ? { in: scope } : { not: null } },
          { role: Role.HOD, memberOf: { some: scope ? { departmentId: { in: scope } } : {} } }
        ]
      },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        memberOf: { select: { departmentId: true } },
        cohorts: { where: { isActive: true }, select: { departmentId: true } }
      },
      orderBy: { name: "asc" }
    })
  ]);

  /**
   * The people counted as this department's instructors: everyone posted to it,
   * plus any head who is actually delivering here. A head who merely heads the
   * department is left out on purpose, so "3 instructors" keeps meaning "3 people
   * delivering" rather than counting managers twice.
   */
  const instructorsOf = (departmentId: string) => deliverers
    .filter(u => u.role === Role.INSTRUCTOR
      ? u.departmentId === departmentId
      : u.cohorts.some(c => c.departmentId === departmentId))
    .map(u => ({ id: u.id, name: u.name, role: u.role, activeCohorts: u.cohorts.filter(c => c.departmentId === departmentId).length }));

  res.json(rows.map(d => {
    const topicCount = d.curriculumVersions[0]?._count.items ?? 0;
    // Cohorts pinned to different versions have different totals, so the
    // denominator is the sum of each cohort's own list length rather than
    // cohorts × current topics.
    const trackable = d.cohorts.reduce((n, c) => n + (c.curriculumVersion?._count.items ?? topicCount), 0);
    const instructors = instructorsOf(d.id);
    return { id: d.id, name: d.name, instructorCount: instructors.length, cohortCount: d.cohorts.length, completedCohortCount: d.cohorts.filter(c => c.completedAt).length, topicCount, progress: percent(d.cohorts.reduce((n, c) => n + c._count.progress, 0), trackable), instructors };
  }));
}));

// Creating departments stays with the administrator — a HOD administers the
// departments they already head, but cannot mint new ones.
router.post("/departments", allow(Role.ADMIN), asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Department name is required" });

  const department = await prisma.department.create({ data: { name } });
  res.status(201).json(department);
}));

router.get("/departments/:id", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const departmentId = String(req.params.id);
  const scope = await scopeOf(req.user!);
  if (!inScope(scope, departmentId)) return res.status(404).json({ message: "Department not found" });

  const [department, deliverers] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId }, include: { curriculumVersions: CURRENT_VERSION, cohorts: { where: { isActive: true }, include: { progress: true, curriculumVersion: { select: { version: true, _count: { select: { items: true } } } }, instructor: { select: { id: true, name: true, isActive: true } }, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } } } }),
    // Instructors posted here plus the heads who head it — see `canDeliverIn`.
    // The cohorts are narrowed to *this* department: a head delivering in two must
    // not have the other one's cohorts counted into this page's delivery table.
    prisma.user.findMany({
      where: canDeliverIn(departmentId),
      select: {
        ...STAFF_FIELDS,
        cohorts: { where: { isActive: true, departmentId }, include: { progress: true, curriculumVersion: { select: { version: true, _count: { select: { items: true } } } }, _count: { select: { enrollments: true } } } }
      },
      orderBy: { name: "asc" }
    })
  ]);
  if (!department) return res.status(404).json({ message: "Department not found" });

  const { curriculumVersions, cohorts, ...rest } = department;
  const current = curriculumVersions[0] ?? null;

  /**
   * Each cohort reports against the list it is delivering, which for one already
   * in progress may be an older version than the department's current one.
   * `curriculumVersion` is null while a cohort has not started.
   */
  const shape = <T extends { progress: unknown[]; curriculumVersion: { version: number; _count: { items: number } } | null }>(c: T) => {
    const topicCount = c.curriculumVersion?._count.items ?? current?.items.length ?? 0;
    return { ...c, curriculumVersion: c.curriculumVersion && { version: c.curriculumVersion.version }, topicCount, progressPercent: percent(c.progress.length, topicCount) };
  };

  // `curriculum` stays the current version's topics under its original key — it is
  // what the editor loads — with the version alongside it for the page header.
  // `users` keeps its key too, but each entry now carries `role`: the client needs
  // to tell an instructor from a head who also teaches.
  res.json({ ...rest, curriculum: current?.items ?? [], curriculumVersion: current && { version: current.version, publishedAt: current.publishedAt }, cohorts: cohorts.map(shape), users: deliverers.map(i => ({ ...i, cohorts: i.cohorts.map(shape) })) });
}));

/**
 * Publish a revision of the curriculum. Appends a version rather than replacing
 * topics, which is what makes it safe to run while cohorts are mid-delivery: they
 * keep the list they started with, and the new one applies to cohorts that have
 * not started and to every future cohort.
 */
router.put("/departments/:id/curriculum", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const departmentId = String(req.params.id);
  const scope = await scopeOf(req.user!);
  if (!inScope(scope, departmentId)) return res.status(404).json({ message: "Department not found" });

  const items: { title: string; description: string | null }[] = (req.body.items || [])
    .filter((x: any) => x.title?.trim())
    .map((x: any) => ({ title: x.title.trim(), description: x.description?.trim() || null }));
  if (!items.length) return res.status(400).json({ message: "Add at least one curriculum topic" });

  const department = await prisma.department.findUnique({ where: { id: departmentId }, include: { curriculumVersions: CURRENT_VERSION } });
  if (!department) return res.status(404).json({ message: "Department not found" });
  const current = department.curriculumVersions[0] ?? null;

  // Publishing the same list again is not a republish, so it mints no version.
  const unchanged = current
    && current.items.length === items.length
    && current.items.every((topic, i) => topic.title === items[i].title && topic.description === items[i].description);
  if (unchanged) return res.json({ items: current.items, version: current.version, publishedAt: current.publishedAt, cohortsInProgress: 0 });

  /**
   * A cohort is pinned to a version once its instructor records a topic, so one
   * that is pinned and not yet completed is mid-delivery. The warning is enforced
   * here rather than in the client because only the server knows every pin — and
   * because an API caller should not be able to blunder past it either.
   */
  const inProgress = await prisma.cohort.findMany({
    where: { departmentId, curriculumVersionId: { not: null }, completedAt: null },
    select: { id: true, name: true, curriculumVersion: { select: { version: true, _count: { select: { items: true } } } }, _count: { select: { progress: true } } },
    orderBy: { name: "asc" }
  });

  if (inProgress.length && req.body.acknowledge !== true) {
    return res.status(409).json({
      message: "Changes to the curriculum will not be applied to cohorts that have already started.",
      requiresAcknowledgement: true,
      affectedCohorts: inProgress.map(c => ({ id: c.id, name: c.name, version: c.curriculumVersion!.version, topicsCovered: c._count.progress, topicCount: c.curriculumVersion!._count.items }))
    });
  }

  // One statement, and nothing is deleted — so every recorded progress row and
  // open dispute stays valid however many times the curriculum is republished.
  const published = await prisma.curriculumVersion.create({
    data: { departmentId, version: (current?.version ?? 0) + 1, items: { create: items.map((topic, position) => ({ ...topic, position })) } },
    include: { items: { orderBy: { position: "asc" } } }
  });
  res.json({ items: published.items, version: published.version, publishedAt: published.publishedAt, cohortsInProgress: inProgress.length });
}));

/**
 * Staff accounts — instructors and heads of department. Both are created,
 * deactivated and reactivated identically, so they share one set of routes.
 * `staffDepartments` and `STAFF_FIELDS` live in `shared/profile` because the
 * profile endpoints answer with the same shape.
 */
router.get("/staff", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const scope = await scopeOf(req.user!);
  // Deactivated accounts are included so they can be reviewed and reactivated;
  // the client filters by `isActive`. A HOD sees only instructors in their own
  // departments — head-of-department accounts are the administrator's to manage.
  const users = await prisma.user.findMany({
    where: scope ? { role: Role.INSTRUCTOR, departmentId: { in: scope } } : { role: { in: [Role.INSTRUCTOR, Role.HOD] } },
    // An explicit projection, and the picture opted into: what travels is one short
    // URL per person, which the browser then fetches from the bucket in parallel and
    // caches. The image bytes never enter this payload.
    select: {
      ...STAFF_FIELDS,
      avatarPath: true,
      department: { select: { id: true, name: true } },
      memberOf: { select: { department: { select: { id: true, name: true } } } },
      _count: { select: { cohorts: { where: { isActive: true } } } }
    },
    orderBy: { name: "asc" }
  });
  res.json(users.map(({ memberOf, avatarPath, ...u }) => ({ ...u, avatarUrl: avatarUrlOf(avatarPath), activeCohorts: u._count.cohorts, departments: staffDepartments({ ...u, memberOf }) })));
}));

router.post("/staff", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const { name, username, password, email } = req.body;
  const role = req.body.role === Role.HOD ? Role.HOD : Role.INSTRUCTOR;
  if (!name?.trim() || !username?.trim() || !password) return res.status(400).json({ message: "Name, username and password are required" });

  const scope = await scopeOf(req.user!);
  if (scope && role !== Role.INSTRUCTOR) return res.status(403).json({ message: "Only an administrator can create head-of-department accounts" });

  const departmentIds: string[] = role === Role.HOD
    ? [...new Set<string>((req.body.departmentIds || []).filter(Boolean))]
    : [req.body.departmentId].filter(Boolean);

  if (!departmentIds.length) return res.status(400).json({ message: role === Role.HOD ? "Select at least one department" : "Department is required" });
  if (scope && departmentIds.some(id => !inScope(scope, id))) return res.status(404).json({ message: "Department not found" });
  if (await prisma.department.count({ where: { id: { in: departmentIds } } }) !== departmentIds.length) return res.status(400).json({ message: "One or more of those departments do not exist" });

  const normalizedUsername = username.trim().toLowerCase();
  // Must be case-insensitive: legacy rows can hold mixed-case usernames, and a
  // case-sensitive findUnique misses them — creating a second account instead of
  // reactivating the deactivated one, which then shadows it at login.
  const existing = await prisma.user.findFirst({ where: { username: { equals: normalizedUsername, mode: "insensitive" } } });

  if (existing?.isActive) return res.status(409).json({ message: "That username is already in use" });
  if (existing && existing.role !== role) return res.status(409).json({ message: "That username belongs to another account" });
  if (existing && scope && !inScope(scope, existing.departmentId)) return res.status(404).json({ message: "Account not found" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const fields = { name: name.trim(), email: email?.trim() || null, password: hashedPassword, departmentId: role === Role.INSTRUCTOR ? departmentIds[0] : null };

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { ...fields, username: normalizedUsername, isActive: true }, select: { ...STAFF_FIELDS } })
    : await prisma.user.create({ data: { ...fields, username: normalizedUsername, role }, select: { ...STAFF_FIELDS } });

  // Memberships drive scoping, so they are brought exactly into line with the
  // submitted set on both create and reactivate.
  await prisma.$transaction([
    prisma.departmentMember.deleteMany({ where: { userId: user.id, departmentId: { notIn: departmentIds } } }),
    ...departmentIds.map(departmentId => prisma.departmentMember.upsert({ where: { userId_departmentId: { userId: user.id, departmentId } }, create: { userId: user.id, departmentId }, update: {} }))
  ]);

  res.status(201).json(user);
}));

/** Shared authorisation for acting on one staff account. */
const findManageableStaff = async (req: AuthRequest, where: { isActive?: boolean }) => {
  const target = await prisma.user.findFirst({ where: { id: String(req.params.id), role: { in: [Role.INSTRUCTOR, Role.HOD] }, ...where } });
  if (!target) return null;

  const scope = await scopeOf(req.user!);
  // A HOD may act on instructors in their own departments, never on another HOD.
  if (scope && (target.role !== Role.INSTRUCTOR || !inScope(scope, target.departmentId))) return null;
  return target;
};

router.delete("/staff/:id", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const target = await findManageableStaff(req, { isActive: true });
  if (!target) return res.status(404).json({ message: "Account not found" });

  // Memberships are left in place so reactivating restores the account exactly.
  await prisma.$transaction([
    prisma.cohort.updateMany({ where: { instructorId: target.id, isActive: true }, data: { instructorId: null } }),
    prisma.user.update({ where: { id: target.id }, data: { isActive: false } })
  ]);
  res.status(204).send();
}));

router.patch("/staff/:id/reactivate", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const target = await findManageableStaff(req, {});
  if (!target) return res.status(404).json({ message: "Account not found" });
  if (target.isActive) return res.status(409).json({ message: "That account is already active" });

  // Their existing password and departments are untouched, so they can sign in
  // immediately. Cohorts unassigned at deactivation stay unassigned — an admin
  // or HOD reassigns those deliberately from the department page.
  res.json(await prisma.user.update({ where: { id: target.id }, data: { isActive: true }, select: { ...STAFF_FIELDS } }));
}));

/**
 * One staff member's profile, for a manager. Read-only: nobody resets anyone
 * else's password here — a forgotten one is handled by deactivating and re-adding
 * the username, which reuses the row above.
 *
 * `findManageableStaff` already encodes who may look: an administrator at anyone,
 * a HOD only at instructors in their own departments, 404 otherwise. `{}` rather
 * than `{ isActive: true }` so a deactivated account can still be reviewed.
 */
router.get("/staff/:id", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const target = await findManageableStaff(req, {});
  if (!target) return res.status(404).json({ message: "Account not found" });

  res.json(await profileOf(target.id));
}));

router.patch("/cohorts/:id/instructor", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const cohort = await prisma.cohort.findUnique({ where: { id: String(req.params.id) } });
  if (!cohort || !cohort.isActive) return res.status(404).json({ message: "Active cohort not found" });

  const scope = await scopeOf(req.user!);
  if (!inScope(scope, cohort.departmentId)) return res.status(404).json({ message: "Active cohort not found" });

  // Heads of department are eligible too — see `canDeliverIn`. Because a HOD is
  // also a manager, this is equally how they take a cohort on themselves.
  const instructor = await prisma.user.findFirst({
    where: { id: req.body.instructorId, ...canDeliverIn(cohort.departmentId) }
  });
  if (!instructor) return res.status(400).json({ message: "Choose an active instructor from this department, or one of its heads" });

  const updated = await prisma.cohort.update({
    where: { id: cohort.id },
    data: { instructorId: instructor.id },
    include: { instructor: { select: { id: true, name: true } } }
  });
  res.json(updated);
}));

/** Cohort roster. Read-only: enrolling is the instructor's job, and nothing here removes a student. */
router.get("/cohorts/:id/students", allow(Role.ADMIN, Role.HOD, Role.INSTRUCTOR), asyncHandler(async (req: AuthRequest, res) => {
  const cohort = await prisma.cohort.findUnique({ where: { id: String(req.params.id) } });
  const notFound = () => res.status(404).json({ message: "Cohort not found" });
  if (!cohort) return notFound();

  if (req.user!.role === Role.INSTRUCTOR) {
    if (cohort.instructorId !== req.user!.id) return notFound();
  } else if (!inScope(await scopeOf(req.user!), cohort.departmentId)) {
    return notFound();
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: cohort.id },
    include: { student: { select: { id: true, name: true, username: true, email: true, isActive: true } } },
    orderBy: { student: { name: "asc" } }
  });
  res.json(enrollments.map(e => ({ ...e.student, enrolledAt: e.createdAt })));
}));

/**
 * The delivery workspace. Open to heads of department as well as instructors:
 * heading a department and teaching in it are not exclusive, and every route below
 * filters on `instructorId: req.user!.id`, so widening the guard grants a HOD
 * their own cohorts and nothing more.
 */
router.get("/instructor/cohorts", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
  const cohorts = await prisma.cohort.findMany({ where: { instructorId: req.user!.id }, include: { department: { include: { curriculumVersions: CURRENT_VERSION } }, curriculumVersion: PINNED_VERSION, progress: true, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" } });
  res.json(cohorts.map(({ department, curriculumVersion, ...c }) => {
    const topics = topicsFor({ curriculumVersion }, department);
    const current = department.curriculumVersions[0] ?? null;
    const version = curriculumVersion?.version ?? current?.version ?? null;
    return {
      ...c,
      department: { id: department.id, name: department.name },
      curriculum: topics.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) })),
      progressPercent: percent(c.progress.length, topics.length),
      // `isOutdated` is how the dashboard explains why this cohort's topics differ
      // from what the department has published since it started.
      curriculumVersion: version === null ? null : { version, isOutdated: !!current && version < current.version, currentVersion: current?.version ?? null, currentPublishedAt: current?.publishedAt ?? null }
    };
  }));
}));

router.post("/instructor/cohorts", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, role: true, isActive: true, departmentId: true, memberOf: { select: { departmentId: true } } }
  });
  if (!user?.isActive) return res.status(403).json({ message: "This account is inactive" });

  // An instructor delivers in the one department they are posted to; a head can
  // deliver in any they head, so which one a new cohort belongs to has to be
  // asked for — unless there is only one it could be.
  const candidates = user.role === Role.HOD
    ? user.memberOf.map(m => m.departmentId)
    : [user.departmentId].filter((id): id is string => !!id);
  if (!candidates.length) return res.status(400).json({ message: user.role === Role.HOD ? "You do not head any department yet" : "Instructor has no assigned department" });

  const departmentId = req.body.departmentId ? String(req.body.departmentId) : candidates.length === 1 ? candidates[0] : null;
  if (!departmentId) return res.status(400).json({ message: "Choose which department this cohort belongs to" });
  // 404, not 403: a head must not be able to use error codes to discover which
  // other departments exist, the same rule `inScope` follows.
  if (!candidates.includes(departmentId)) return res.status(404).json({ message: "Department not found" });

  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Cohort name is required" });
  const existingCohort = await prisma.cohort.findFirst({
    where: { departmentId, name: { equals: name, mode: "insensitive" } }
  });
  if (existingCohort) {
    return res.status(409).json({
      message: "A cohort with this name already exists in your department. Use a different name or ask an admin to reassign the existing cohort."
    });
  }

  const cohort = await prisma.cohort.create({ data: { name, departmentId, instructorId: user.id } });
  res.status(201).json(cohort);
}));

router.post("/instructor/cohorts/:cohortId/students", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
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

router.put("/instructor/cohorts/:cohortId/progress/:itemId", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
  const cohortId = String(req.params.cohortId);
  const itemId = String(req.params.itemId);
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, instructorId: req.user!.id }, include: { department: { include: { curriculumVersions: CURRENT_VERSION } }, curriculumVersion: PINNED_VERSION } });
  if (!cohort) return res.status(404).json({ message: "Cohort not found" });
  // A completed cohort is frozen, otherwise unticking a topic would leave it
  // marked complete while sitting below 100%.
  if (cohort.completedAt) return res.status(409).json({ message: "This cohort is marked completed. Reopen it before changing recorded progress." });

  // The topic has to belong to the list this cohort is delivering, or a stale
  // client could record one from a superseded version — or another department's.
  const version = cohort.curriculumVersion ?? cohort.department.curriculumVersions[0] ?? null;
  if (!version) return res.status(400).json({ message: "This department has no published curriculum yet" });
  if (!version.items.some(item => item.id === itemId)) return res.status(400).json({ message: "That topic is not part of this cohort's curriculum" });

  if (req.body.completed) {
    // Recording the first topic pins the cohort to the version it is delivering,
    // so a later republish cannot swap the list out from under it. Unticking back
    // to nothing does not unpin: the cohort has demonstrably started.
    await prisma.$transaction([
      prisma.progress.upsert({ where: { cohortId_curriculumItemId: { cohortId: cohort.id, curriculumItemId: itemId } }, create: { cohortId: cohort.id, curriculumItemId: itemId }, update: { completedAt: new Date() } }),
      ...(cohort.curriculumVersionId ? [] : [prisma.cohort.update({ where: { id: cohort.id }, data: { curriculumVersionId: version.id } })])
    ]);
  } else {
    await prisma.progress.deleteMany({ where: { cohortId: cohort.id, curriculumItemId: itemId } });
  }
  res.status(204).send();
}));

/**
 * Mark delivery finished. Whether every topic is covered is re-checked here
 * rather than trusted from the client, which only hides the button.
 */
router.patch("/instructor/cohorts/:cohortId/complete", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
  const cohort = await prisma.cohort.findFirst({
    where: { id: String(req.params.cohortId), instructorId: req.user!.id },
    include: { department: { include: { curriculumVersions: CURRENT_VERSION } }, curriculumVersion: PINNED_VERSION, progress: { select: { curriculumItemId: true } } }
  });
  if (!cohort) return res.status(404).json({ message: "Cohort not found" });
  if (cohort.completedAt) return res.status(409).json({ message: "This cohort is already marked completed" });

  // Its own list, not the department's current one: a cohort pinned to a
  // five-topic version still completes at five even if eight are published now.
  const topicIds = topicsFor(cohort, cohort.department).map(item => item.id);
  if (!topicIds.length) return res.status(400).json({ message: "This department has no published curriculum yet" });

  const covered = new Set(cohort.progress.map(p => p.curriculumItemId));
  const remaining = topicIds.filter(id => !covered.has(id)).length;
  if (remaining > 0) return res.status(400).json({ message: `${remaining} ${remaining === 1 ? "topic has" : "topics have"} not been covered yet` });

  res.json(await prisma.cohort.update({ where: { id: cohort.id }, data: { completedAt: new Date() } }));
}));

router.patch("/instructor/cohorts/:cohortId/reopen", allow(Role.INSTRUCTOR, Role.HOD), asyncHandler(async (req: AuthRequest, res) => {
  const cohort = await prisma.cohort.findFirst({ where: { id: String(req.params.cohortId), instructorId: req.user!.id } });
  if (!cohort) return res.status(404).json({ message: "Cohort not found" });
  if (!cohort.completedAt) return res.status(409).json({ message: "This cohort is not marked completed" });

  // Recorded progress is untouched, so reopening and completing again is lossless.
  res.json(await prisma.cohort.update({ where: { id: cohort.id }, data: { completedAt: null } }));
}));

/**
 * Every active course the student is enrolled in. Returns an array because a
 * student can register for more than one department; an empty array means they
 * are not in any active cohort yet.
 */
router.get("/student/progress", allow(Role.STUDENT), asyncHandler(async (req: AuthRequest, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: req.user!.id, cohort: { isActive: true } },
    include: { cohort: { include: { department: { include: { curriculumVersions: CURRENT_VERSION } }, curriculumVersion: PINNED_VERSION, progress: true, instructor: { select: { name: true } } } } }
  });

  res.json(
    enrollments
      .map(({ cohort: c }) => {
        // The list their own cohort is delivering — students are shown no version
        // labels, so what they see is simply their topics.
        const topics = topicsFor(c, c.department);
        return {
          cohort: { id: c.id, name: c.name, department: c.department.name, instructor: c.instructor?.name || "Awaiting instructor assignment", completedAt: c.completedAt },
          progressPercent: percent(c.progress.length, topics.length),
          curriculum: topics.map(item => ({ ...item, isCompleted: c.progress.some(p => p.curriculumItemId === item.id) }))
        };
      })
      .sort((a, b) => a.cohort.department.localeCompare(b.cohort.department))
  );
}));

router.post("/student/disputes", allow(Role.STUDENT), asyncHandler(async (req: AuthRequest, res) => {
  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId: req.user!.id, cohortId: req.body.cohortId },
    include: { cohort: { include: { department: { include: { curriculumVersions: CURRENT_VERSION } }, curriculumVersion: PINNED_VERSION } } }
  });
  if (!enrolled) return res.status(403).json({ message: "You are not enrolled in this cohort" });

  // Disputes are raised against a topic the student can actually see, which is
  // their cohort's list rather than whatever the department has published since.
  const topics = topicsFor(enrolled.cohort, enrolled.cohort.department);
  if (!topics.some(topic => topic.id === req.body.curriculumItemId)) return res.status(400).json({ message: "That topic is not part of this cohort's curriculum" });

  const dispute = await prisma.dispute.create({ data: { studentId: req.user!.id, cohortId: req.body.cohortId, curriculumItemId: req.body.curriculumItemId, reason: req.body.reason } });
  res.status(201).json(dispute);
}));

router.get("/disputes", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const scope = await scopeOf(req.user!);
  res.json(await prisma.dispute.findMany({
    where: scope ? { cohort: { departmentId: { in: scope } } } : {},
    include: { student: { select: { name: true } }, cohort: { include: { department: true, instructor: { select: { name: true } } } }, curriculumItem: true },
    orderBy: { createdAt: "desc" }
  }));
}));

router.patch("/disputes/:id/resolve", allow(...MANAGERS), asyncHandler(async (req: AuthRequest, res) => {
  const dispute = await prisma.dispute.findUnique({ where: { id: String(req.params.id) }, include: { cohort: { select: { departmentId: true } } } });
  if (!dispute) return res.status(404).json({ message: "Dispute not found" });

  const scope = await scopeOf(req.user!);
  if (!inScope(scope, dispute.cohort.departmentId)) return res.status(404).json({ message: "Dispute not found" });

  res.json(await prisma.dispute.update({ where: { id: dispute.id }, data: { status: DisputeStatus.RESOLVED, resolvedAt: new Date() } }));
}));

export default router;
