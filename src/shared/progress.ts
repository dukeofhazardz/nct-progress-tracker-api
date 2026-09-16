/**
 * Coverage as a whole percentage, guarding the no-topics case.
 *
 * Shared rather than redefined per module so every surface rounds the same way —
 * the department pages, the instructor dashboard and the profile pages all quote
 * these numbers side by side.
 */
export const percent = (done: number, total: number) => total ? Math.round(done / total * 100) : 0;

/**
 * How many topics a cohort is measured against — the denominator to `percent`.
 *
 * A cohort in progress reports against the version it was pinned to, which may be
 * older than what its department has published since. An unpinned cohort has not
 * started, so it follows the department's current version.
 *
 * The caller selects `_count.items` on both the pinned version and the department's
 * highest one; `topicsFor` in the tracker routes answers the same question for
 * callers that need the titles rather than the count.
 */
export const topicCountOf = (cohort: {
  curriculumVersion: { _count: { items: number } } | null;
  department: { curriculumVersions: { _count: { items: number } }[] };
}) => cohort.curriculumVersion?._count.items ?? cohort.department.curriculumVersions[0]?._count.items ?? 0;
