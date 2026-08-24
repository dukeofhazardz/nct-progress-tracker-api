import api from '../axiosInstance';

export const tracker = {
  departments: () => api.get('/departments').then((response) => response.data),
  addDepartment: (name) =>
    api.post('/departments', { name }).then((response) => response.data),
  department: (id) => api.get(`/departments/${id}`).then((response) => response.data),
  updateCurriculum: (departmentId, items) =>
    api.put(`/departments/${departmentId}/curriculum`, { items }).then((response) => response.data),
  instructors: () => api.get('/instructors').then((response) => response.data),
  addInstructor: (data) => api.post('/instructors', data).then((response) => response.data),
  // Soft delete: the account is deactivated, never destroyed, so it can be restored.
  deactivateInstructor: (id) => api.delete(`/instructors/${id}`),
  reactivateInstructor: (id) =>
    api.patch(`/instructors/${id}/reactivate`).then((response) => response.data),
  assignInstructor: (cohortId, instructorId) =>
    api.patch(`/cohorts/${cohortId}/instructor`, { instructorId }).then((response) => response.data),
  disputes: () => api.get('/disputes').then((response) => response.data),
  resolve: (id) => api.patch(`/disputes/${id}/resolve`).then((response) => response.data),
  cohorts: () => api.get('/instructor/cohorts').then((response) => response.data),
  createCohort: (name) => api.post('/instructor/cohorts', { name }).then((response) => response.data),
  enrollStudent: (cohortId, username) =>
    api.post(`/instructor/cohorts/${cohortId}/students`, { username }),
  setProgress: (cohortId, itemId, completed) =>
    api.put(`/instructor/cohorts/${cohortId}/progress/${itemId}`, { completed }),
  studentProgress: () => api.get('/student/progress').then((response) => response.data),
  dispute: (data) => api.post('/student/disputes', data).then((response) => response.data),
};
