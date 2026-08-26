-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Cohort_departmentId_completedAt_idx" ON "Cohort"("departmentId", "completedAt");
