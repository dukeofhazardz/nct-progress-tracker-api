-- AlterEnum
-- Postgres cannot use a newly added enum value in the same transaction that adds
-- it, so this statement is applied and committed on its own.
ALTER TYPE "Role" ADD VALUE 'HOD';

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMember_userId_departmentId_key" ON "DepartmentMember"("userId", "departmentId");

-- CreateIndex
CREATE INDEX "DepartmentMember_departmentId_idx" ON "DepartmentMember"("departmentId");

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve every existing single-department association so no student
-- or instructor loses their department when reads move to the join table.
INSERT INTO "DepartmentMember" ("id", "userId", "departmentId", "createdAt")
SELECT gen_random_uuid(), "id", "departmentId", now()
FROM "User"
WHERE "departmentId" IS NOT NULL
ON CONFLICT ("userId", "departmentId") DO NOTHING;
