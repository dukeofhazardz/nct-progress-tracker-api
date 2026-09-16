/**
 * The three states `studentStatus` derives on the server, as the client presents them.
 *
 * Derived there rather than here so that a badge, a filter, a sort order and an export
 * cannot disagree about the same person; this file only names and orders them.
 *
 * "Completed" means every cohort they are in has been signed off by its instructor,
 * which is stricter than every topic being ticked — the detail page says so in words
 * where the two differ. "Not enrolled" is a real state, not a gap: those are the
 * students who registered and were never put in a cohort.
 */
export const statusLabels = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  NOT_ENROLLED: 'Not enrolled',
};

/** Journey order, so sorting the column reads as progress rather than alphabetically. */
export const statusOrder = { NOT_ENROLLED: 0, IN_PROGRESS: 1, COMPLETED: 2 };

export const statusTones = { COMPLETED: 'success', IN_PROGRESS: 'brand', NOT_ENROLLED: 'neutral' };
