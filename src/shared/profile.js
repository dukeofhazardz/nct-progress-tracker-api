import { prisma } from "../lib/prisma.js";
import { publicUrl } from "../lib/supabase.js";
import { Role } from "../generated/prisma/enums.js";
import { percent } from "./progress.js";
/**
 * The scalar columns of `User` that are safe to serialise.
 *
 * An explicit projection rather than stripping fields afterwards: a `findMany`
 * with no `select` returns every scalar, so the day a column is added to `User` it
 * silently starts appearing in every staff response. `password` and `avatarPath`
 * are both absent by design — opt into the picture with
 * `{ ...STAFF_FIELDS, avatarPath: true }` and map it through `avatarUrlOf`, which
 * is what the endpoints that render a face do.
 *
 * Always spread it (`select: { ...STAFF_FIELDS }`) so Prisma keeps the literal
 * `true` types it needs to infer the payload.
 */
export const STAFF_FIELDS = {
    id: true,
    name: true,
    username: true,
    email: true,
    role: true,
    isActive: true,
    departmentId: true,
    createdAt: true,
    updatedAt: true
};
/**
 * Shortest password either route that sets one will accept — `PATCH /me/password`,
 * where the owner changes their own, and `PATCH /staff/:id/password`, where a
 * manager resets someone else's. Shared so the two cannot enforce different rules.
 *
 * `register` predates both and enforces no minimum at all; that inconsistency is
 * pre-existing and deliberately left alone here.
 */
export const MIN_PASSWORD = 8;
/**
 * Staff accounts — instructors and heads of department. Both are created,
 * deactivated and reactivated identically, so they share one set of routes.
 *
 * An instructor's department is `User.departmentId` (cohort creation depends on
 * it); a HOD's departments are `DepartmentMember` rows. Every response
 * normalises both into a `departments` array so the client renders one shape.
 */
export const staffDepartments = (user) => user.role === Role.HOD
    ? user.memberOf.map(m => m.department)
    : user.department ? [user.department] : [];
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
/** Decoded bytes an uploaded picture may occupy. ~88 KB once base64-encoded. */
const AVATAR_LIMIT = 64 * 1024;
/** `data:` URL, one of the three formats a canvas can produce, base64 only. */
const AVATAR_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
/** What the bucket object is named. `jpeg` is the only one that differs. */
const EXTENSIONS = { png: "png", jpeg: "jpg", webp: "webp" };
/**
 * Validate an incoming picture and hand back the bytes to store.
 *
 * The client downscales to a 256×256 square before upload, so anything arriving
 * over the limit is either a client that skipped that step or a caller
 * hand-rolling requests — both get a message naming the limit rather than
 * Express's bare 413.
 *
 * The pattern is the whole of the validation, and it matters more now that the
 * result is written to a public bucket: it pins the media type (no
 * `data:text/html`, which a browser would happily run if the URL were opened
 * directly) and rejects anything that is not base64. The bytes themselves are
 * never decoded as an image server-side.
 */
export const readAvatarUpload = (value) => {
    if (typeof value !== "string" || !value.trim())
        throw badRequest("No image was uploaded");
    const match = AVATAR_URL.exec(value.trim());
    if (!match)
        throw badRequest("Upload a PNG, JPEG or WebP image");
    const [, subtype, base64] = match;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > AVATAR_LIMIT)
        throw badRequest(`That picture is ${Math.round(bytes.length / 1024)} KB; the limit is ${AVATAR_LIMIT / 1024} KB`);
    return { bytes, mimeType: `image/${subtype}`, extension: EXTENSIONS[subtype] };
};
/**
 * The public URL for a stored picture, or null for someone who has not set one.
 *
 * Derived rather than stored so that `/api/me`, `/api/staff/:id`, `GET /staff` and
 * the login payload cannot drift, and so the bucket can move without rewriting
 * rows. The raw path stays server-side — it is only useful for writing.
 */
export const avatarUrlOf = (avatarPath) => (avatarPath ? publicUrl(avatarPath) : null);
/**
 * One staff member as a person: who they are, what they are delivering now and
 * what they have finished.
 *
 * Shared by `GET /api/me` and `GET /api/staff/:id` so a manager reading someone
 * else's profile and that person reading their own cannot drift apart. Counts
 * only — no topic titles, no progress rows — because neither page lists topics.
 *
 * Cohorts come back in one list, completed and in-progress together; the client
 * splits them on `completedAt`.
 */
export const profileOf = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            ...STAFF_FIELDS,
            avatarPath: true,
            department: { select: { id: true, name: true } },
            memberOf: { select: { department: { select: { id: true, name: true } } } },
            // Archived cohorts are left out, matching `activeCohorts` everywhere else.
            // Completing a cohort does not archive it, so completed ones still appear.
            cohorts: {
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    completedAt: true,
                    createdAt: true,
                    department: {
                        select: {
                            id: true,
                            name: true,
                            curriculumVersions: { orderBy: { version: "desc" }, take: 1, select: { _count: { select: { items: true } } } }
                        }
                    },
                    curriculumVersion: { select: { version: true, _count: { select: { items: true } } } },
                    _count: { select: { progress: true, enrollments: true } }
                },
                orderBy: { createdAt: "desc" }
            }
        }
    });
    if (!user)
        return null;
    const { department, memberOf, cohorts, avatarPath, ...rest } = user;
    return {
        ...rest,
        // The path itself is withheld — the client only ever needs somewhere to point
        // an `<img>`, and exposing it would invite a second way to build the URL.
        avatarUrl: avatarUrlOf(avatarPath),
        departments: staffDepartments({ role: rest.role, department, memberOf }),
        cohorts: cohorts.map(c => {
            // A cohort in progress reports against the list it was pinned to, which may
            // be older than what its department has published since. An unpinned cohort
            // has not started, so it follows the department's current version.
            const topicCount = c.curriculumVersion?._count.items ?? c.department.curriculumVersions[0]?._count.items ?? 0;
            const topicsCovered = c._count.progress;
            return {
                id: c.id,
                name: c.name,
                department: { id: c.department.id, name: c.department.name },
                studentCount: c._count.enrollments,
                topicCount,
                topicsCovered,
                progressPercent: percent(topicsCovered, topicCount),
                curriculumVersion: c.curriculumVersion?.version ?? null,
                completedAt: c.completedAt,
                createdAt: c.createdAt
            };
        })
    };
};
