import { Router } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { deleteObject, putObject } from "../../lib/supabase.js";
import { protect } from "../../shared/middleware/auth.middleware.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { avatarUrlOf, profileOf, readAvatarUpload } from "../../shared/profile.js";
/**
 * A signed-in account acting on itself: reading its own profile, changing its own
 * password, setting its own picture.
 *
 * Deliberately role-agnostic — every route keys off `req.user!.id` and nothing
 * else, so there is no scope to get wrong and no way to reach another account.
 * Only the client decides who is offered a link to it.
 */
const router = Router();
router.use(protect);
/** Shortest new password accepted. `register` predates this and enforces none. */
const MIN_PASSWORD = 8;
router.get("/", asyncHandler(async (req, res) => {
    const profile = await profileOf(req.user.id);
    if (!profile)
        return res.status(404).json({ message: "Account not found" });
    res.json(profile);
}));
router.patch("/password", asyncHandler(async (req, res) => {
    const currentPassword = String(req.body.currentPassword ?? "");
    const newPassword = String(req.body.newPassword ?? "");
    if (!currentPassword || !newPassword)
        return res.status(400).json({ message: "Enter your current password and a new one" });
    if (newPassword.length < MIN_PASSWORD)
        return res.status(400).json({ message: `Your new password must be at least ${MIN_PASSWORD} characters` });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, password: true } });
    if (!user)
        return res.status(404).json({ message: "Account not found" });
    // 400, never 401. axiosInstance hard-redirects to /login on any 401, so
    // answering 401 here would sign the user out for a typo and throw the message
    // away — the same reason the deactivated-account path in auth.service.ts is 403.
    if (!await bcrypt.compare(currentPassword, user.password))
        return res.status(400).json({ message: "That is not your current password" });
    if (await bcrypt.compare(newPassword, user.password))
        return res.status(400).json({ message: "Your new password must be different from your current one" });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    // Tokens already issued stay valid — they are stateless with a one-day expiry
    // and there is no revocation list — so the caller stays signed in here.
    res.json({ message: "Your password has been changed" });
}));
/**
 * The picture goes to a Supabase Storage bucket and the row keeps only its path,
 * so an `<img src>` can fetch it without this API's bearer token — which is the
 * problem storing a `data:` URL on the row used to solve from the other side.
 */
router.put("/avatar", asyncHandler(async (req, res) => {
    const { bytes, mimeType, extension } = readAvatarUpload(req.body.avatar);
    const before = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatarPath: true } });
    // A fresh path every time rather than overwriting one path per person: stored
    // objects are served with a year-long `Cache-Control`, so reusing the path would
    // leave browsers showing the previous face until that expired.
    const path = `${req.user.id}/${randomUUID()}.${extension}`;
    // Upload before the row is touched. If the store is unreachable this throws and
    // the caller keeps the picture they already had, instead of ending up with a row
    // pointing at an object that was never written.
    await putObject(path, bytes, mimeType);
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarPath: path } });
    // Only once the row points at the new object, and best-effort: see `deleteObject`.
    if (before?.avatarPath)
        await deleteObject(before.avatarPath);
    res.json({ avatarUrl: avatarUrlOf(path) });
}));
router.delete("/avatar", asyncHandler(async (req, res) => {
    const before = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatarPath: true } });
    if (before?.avatarPath) {
        // The row first: a path pointing at a missing object renders as a broken image,
        // whereas an object nothing points at is a few unreferenced kilobytes.
        await prisma.user.update({ where: { id: req.user.id }, data: { avatarPath: null } });
        await deleteObject(before.avatarPath);
    }
    // 204 either way — removing a picture nobody set is not an error.
    res.status(204).send();
}));
export default router;
