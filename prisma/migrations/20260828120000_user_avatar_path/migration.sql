-- Profile pictures move out of the row and into a Supabase Storage bucket.
--
-- 20260826170000_user_avatar put the image on the row as a `data:` URL, because an
-- `<img src>` cannot send this API's bearer token. Storing it in a public bucket
-- solves the same problem from the other end: the picture gets an ordinary URL the
-- browser can fetch and cache, and nothing about it travels in a JSON response.
--
-- What is left here is a pointer — `<userId>/<uuid>.<ext>` inside the bucket, one
-- fresh path per upload so a replaced picture can never be served from cache. The
-- public URL is derived from it at read time rather than stored, so the bucket or
-- the project can move without rewriting rows.
--
-- The dropped column carried no data: profile pictures had not shipped, and every
-- account was verified to have a NULL avatar before this ran.

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar";
ALTER TABLE "User" ADD COLUMN "avatarPath" TEXT;
