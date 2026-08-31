/**
 * Coverage as a whole percentage, guarding the no-topics case.
 *
 * Shared rather than redefined per module so every surface rounds the same way —
 * the department pages, the instructor dashboard and the profile pages all quote
 * these numbers side by side.
 */
export const percent = (done, total) => total ? Math.round(done / total * 100) : 0;
