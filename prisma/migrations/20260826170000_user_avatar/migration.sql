-- Profile pictures.
--
-- The image itself lives on the row as a `data:` URL rather than in object
-- storage: this API authenticates with a bearer token, and an `<img src>` cannot
-- send one, so serving avatars from a URL would mean either a public endpoint or
-- blob-URL plumbing on every page that shows a face. The browser downscales to a
-- 160x160 square before upload and the API caps it at 32 KB decoded, so the
-- bytes ride the authenticated JSON channel that is already there.
--
-- TEXT, not BYTEA: it is stored and returned as the base64 URL the browser
-- produced, and never manipulated server-side.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
