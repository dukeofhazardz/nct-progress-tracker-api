import api from '../axiosInstance';

/**
 * The signed-in account acting on itself. Every route behind `/me` keys off the
 * bearer token and nothing else, so none of these take a user id — and none of
 * them can reach another account.
 */
export const profile = {
  me: () => api.get('/me').then((response) => response.data),
  // A wrong current password answers 400, not 401 — the axios interceptor
  // hard-redirects to /login on any 401, which would sign the user out for a typo
  // and discard the message. Show `response.data.message` as-is.
  changePassword: (currentPassword, newPassword) =>
    api.patch('/me/password', { currentPassword, newPassword }).then((response) => response.data),
  // Takes a `data:` URL and answers `{ avatarUrl }` — where the stored picture can
  // now be fetched from, which is what the session caches for the top bar and
  // sidebar. The bytes go to a storage bucket; only the URL comes back.
  setAvatar: (avatar) => api.put('/me/avatar', { avatar }).then((response) => response.data),
  removeAvatar: () => api.delete('/me/avatar'),
};
