/**
 * Where each role lands after signing in.
 *
 * Admins and HODs share the management pages and their URLs — the server scopes a
 * HOD's data to the departments they head, so there is no separate route tree to
 * maintain. Lives in its own module because `appRoutes.jsx` may only export
 * components for Fast Refresh to work.
 */
export const homePathFor = (role) =>
  ({ ADMIN: '/admin', HOD: '/admin', INSTRUCTOR: '/instructor', STUDENT: '/student' })[role] ??
  '/login';
