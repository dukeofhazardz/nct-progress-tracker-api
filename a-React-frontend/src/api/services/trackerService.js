import api from '../axiosInstance';

export const tracker = {
  // Unauthenticated — the registration form needs department names before the
  // student has an account.
  publicDepartments: () => api.get('/public/departments').then((response) => response.data),
  departments: () => api.get('/departments').then((response) => response.data),
  addDepartment: (name) =>
    api.post('/departments', { name }).then((response) => response.data),
  department: (id) => api.get(`/departments/${id}`).then((response) => response.data),
  updateCurriculum: (departmentId, items) =>
    api.put(`/departments/${departmentId}/curriculum`, { items }).then((response) => response.data),
  // Instructors and heads of department share one set of endpoints — the two are
  // created, deactivated and reactivated identically.
  staff: () => api.get('/staff').then((response) => response.data),
  addStaff: (data) => api.post('/staff', data).then((response) => response.data),
  // Soft delete: the account is deactivated, never destroyed, so it can be restored.
  deactivateStaff: (id) => api.delete(`/staff/${id}`),
  reactivateStaff: (id) => api.patch(`/staff/${id}/reactivate`).then((response) => response.data),
  assignInstructor: (cohortId, instructorId) =>
    api.patch(`/cohorts/${cohortId}/instructor`, { instructorId }).then((response) => response.data),
  cohortStudents: (cohortId) =>
    api.get(`/cohorts/${cohortId}/students`).then((response) => response.data),
  disputes: () => api.get('/disputes').then((response) => response.data),
  resolve: (id) => api.patch(`/disputes/${id}/resolve`).then((response) => response.data),
  cohorts: () => api.get('/instructor/cohorts').then((response) => response.data),
  createCohort: (name) => api.post('/instructor/cohorts', { name }).then((response) => response.data),
  enrollStudent: (cohortId, username) =>
    api.post(`/instructor/cohorts/${cohortId}/students`, { username }),
  setProgress: (cohortId, itemId, completed) =>
    api.put(`/instructor/cohorts/${cohortId}/progress/${itemId}`, { completed }),
  // The server re-checks that every topic is covered; it does not trust the client.
  completeCohort: (cohortId) =>
    api.patch(`/instructor/cohorts/${cohortId}/complete`).then((response) => response.data),
  reopenCohort: (cohortId) =>
    api.patch(`/instructor/cohorts/${cohortId}/reopen`).then((response) => response.data),
  // An array — a student can be enrolled in courses across several departments.
  studentProgress: () => api.get('/student/progress').then((response) => response.data),
  dispute: (data) => api.post('/student/disputes', data).then((response) => response.data),
};
