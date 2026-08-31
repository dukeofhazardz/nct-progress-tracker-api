import "dotenv/config";
/**
 * The one place that knows profile pictures live in a Supabase Storage bucket.
 *
 * Deliberately plain `fetch` rather than `@supabase/supabase-js`: this is three
 * REST calls, and the rest of the app already reaches Supabase through `pg`
 * instead of the SDK. Nothing else in the codebase should mention the bucket —
 * `avatarUrlOf` in `shared/profile` is the seam everything else reads through.
 */
const BUCKET = "avatars";
/** Trailing slashes are easy to paste and would double up in every URL. */
const origin = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_KEY ?? "").trim();
/**
 * False on a clone with no Storage credentials. Reading a profile still works in
 * that state — only setting a picture is refused — because signing in matters
 * more than a headshot to someone who has just pulled the repo.
 */
export const isStorageConfigured = Boolean(origin && serviceKey);
const fail = (status, message) => Object.assign(new Error(message), { status });
/**
 * `apikey` as well as `Authorization`, which is what Supabase's own client sends.
 * The legacy `service_role` JWT is accepted on the bearer header alone, but the
 * newer `sb_secret_…` keys are not universally, and sending both costs nothing.
 */
const authHeaders = () => ({ Authorization: `Bearer ${serviceKey}`, apikey: serviceKey });
/** An external call with no deadline can hold an Express request open indefinitely. */
const TIMEOUT_MS = 10_000;
/**
 * Where the browser fetches a picture from, or null when Storage is unconfigured —
 * a stored path with no project to resolve it against would render as a broken
 * image, and "no picture" is the honest answer. A public bucket, so no bearer token
 * and no signed expiry: that is the whole reason for storing pictures out here, as
 * an `<img src>` cannot send this API's `Authorization` header.
 *
 * Object paths are `<userId>/<uuid>.<ext>`, so they are unguessable, but anyone
 * holding one can read that picture without signing in. Accepted for a staff
 * headshot in an internal tool.
 */
export const publicUrl = (path) => isStorageConfigured ? `${origin}/storage/v1/object/public/${BUCKET}/${path}` : null;
/**
 * Store bytes at `path`, overwriting anything already there.
 *
 * Paths are built from UUIDs by the caller, so they need no escaping. The long
 * `Cache-Control` is safe because a replaced picture is written to a *new* path
 * rather than over the old one — see the avatar routes. Supabase echoes the header
 * back on public reads, so it is the CDN's TTL as well as the browser's.
 *
 * Both `Authorization` and `apikey` are required. A `sb_secret_…` key sent on the
 * bearer header alone is rejected with `Invalid Compact JWS` — Storage tries to parse
 * it as a JWT, which only the legacy `service_role` key is.
 */
export const putObject = async (path, bytes, mimeType) => {
    if (!isStorageConfigured)
        throw fail(503, "Profile pictures are not configured on this server");
    let response;
    try {
        response = await fetch(`${origin}/storage/v1/object/${BUCKET}/${path}`, {
            method: "POST",
            headers: {
                ...authHeaders(),
                "Content-Type": mimeType,
                "Cache-Control": "max-age=31536000, immutable",
                "x-upsert": "true"
            },
            body: new Uint8Array(bytes),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    }
    catch (error) {
        // A timeout or a DNS failure. 502 rather than 500: this API is fine, the thing
        // behind it is not, and the client can sensibly offer to try again.
        console.error("avatar upload could not reach storage:", error);
        throw fail(502, "Could not reach the picture store. Try again in a moment");
    }
    if (!response.ok) {
        // The body carries Supabase's own reason; worth logging, not worth showing —
        // it names buckets and keys the user has no context for.
        console.error(`avatar upload failed: ${response.status} ${await response.text().catch(() => "")}`);
        throw fail(502, "Could not save that picture — the picture store rejected it");
    }
};
/**
 * Best-effort removal. **Never throws**: every caller has already committed the
 * change that matters, and a leftover object is a few unreferenced kilobytes
 * whereas a failed request here would report a removal that did happen as an
 * error.
 *
 * Removal is not retroactive at the edge. The public URL is CDN-fronted and honours
 * the year-long `Cache-Control` above, so an object that was fetched publicly before
 * being deleted keeps being served from the edge even though the origin answers
 * `NoSuchKey` (verified against the live project). Nobody is ever shown a stale face,
 * because a replacement is written to a fresh path — but someone still holding an old
 * URL may keep loading it after the owner removed their picture. Shortening the
 * `max-age` in `putObject` is the lever if that ever needs to stop being true.
 */
export const deleteObject = async (path) => {
    if (!isStorageConfigured)
        return;
    try {
        const response = await fetch(`${origin}/storage/v1/object/${BUCKET}/${path}`, {
            method: "DELETE",
            headers: authHeaders(),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        // 404 is fine — it means the object was already gone.
        if (!response.ok && response.status !== 404) {
            console.warn(`orphaned avatar object ${path}: ${response.status} ${await response.text().catch(() => "")}`);
        }
    }
    catch (error) {
        console.warn(`orphaned avatar object ${path}:`, error);
    }
};
