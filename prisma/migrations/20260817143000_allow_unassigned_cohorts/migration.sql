ALTER TABLE "Cohort"
DROP CONSTRAINT "Cohort_instructorId_fkey";

ALTER TABLE "Cohort"
ALTER COLUMN "instructorId" DROP NOT NULL;

ALTER TABLE "Cohort"
ADD CONSTRAINT "Cohort_instructorId_fkey"
FOREIGN KEY ("instructorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
