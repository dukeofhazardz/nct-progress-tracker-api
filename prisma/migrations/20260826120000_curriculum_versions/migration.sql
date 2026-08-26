-- Curriculum becomes versioned and append-only.
--
-- Publishing used to delete every topic and recreate the list, which is why the
-- API refused to republish once any progress existed: "Progress" cascades on
-- topic delete and "Dispute" restricts, so a republish would either destroy
-- recorded progress or fail on a foreign key. Topics now hang off a
-- "CurriculumVersion" and are never deleted, and a cohort remembers the version
-- it is delivering — so a republish can be allowed to proceed while cohorts
-- already in progress keep exactly the list they started with.

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_departmentId_version_key" ON "CurriculumVersion"("departmentId", "version");

-- CreateIndex
CREATE INDEX "CurriculumVersion_departmentId_version_idx" ON "CurriculumVersion"("departmentId", "version");

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every department that already has topics gets version 1, so no
-- existing curriculum is orphaned.
INSERT INTO "CurriculumVersion" ("id", "departmentId", "version", "publishedAt")
SELECT gen_random_uuid(), "departmentId", 1, now()
FROM "CurriculumItem"
GROUP BY "departmentId";

-- AlterTable: re-parent topics from the department to a version. Added
-- nullable, backfilled, then tightened, because existing rows have no version.
ALTER TABLE "CurriculumItem" ADD COLUMN "versionId" TEXT;

UPDATE "CurriculumItem" i
SET "versionId" = v."id"
FROM "CurriculumVersion" v
WHERE v."departmentId" = i."departmentId" AND v."version" = 1;

ALTER TABLE "CurriculumItem" ALTER COLUMN "versionId" SET NOT NULL;

-- DropIndex / DropForeignKey / DropColumn: the department is now reachable
-- through the version, so a denormalised "departmentId" would only invite drift.
DROP INDEX "CurriculumItem_departmentId_position_key";

DROP INDEX "CurriculumItem_departmentId_idx";

ALTER TABLE "CurriculumItem" DROP CONSTRAINT "CurriculumItem_departmentId_fkey";

ALTER TABLE "CurriculumItem" DROP COLUMN "departmentId";

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumItem_versionId_position_key" ON "CurriculumItem"("versionId", "position");

-- CreateIndex
CREATE INDEX "CurriculumItem_versionId_idx" ON "CurriculumItem"("versionId");

-- AddForeignKey
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: null means the cohort has not started yet and therefore follows
-- whatever the department has published most recently. It is pinned the moment
-- the instructor records the first topic. RESTRICT, not SET NULL: a version a
-- cohort is delivering must not be able to vanish underneath it.
ALTER TABLE "Cohort" ADD COLUMN "curriculumVersionId" TEXT;

-- CreateIndex
CREATE INDEX "Cohort_curriculumVersionId_idx" ON "Cohort"("curriculumVersionId");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill the pins: a cohort with recorded progress has demonstrably started,
-- so it is pinned to the version it has been delivering all along. Cohorts that
-- have not started stay null and will pick up the next published version.
UPDATE "Cohort" c
SET "curriculumVersionId" = v."id"
FROM "CurriculumVersion" v
WHERE v."departmentId" = c."departmentId"
  AND v."version" = 1
  AND EXISTS (SELECT 1 FROM "Progress" p WHERE p."cohortId" = c."id");
