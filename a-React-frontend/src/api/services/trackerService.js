import api from '../axiosInstance';

export const tracker = {
  // Unauthenticated — the registration form needs department names before the
  // student has an account.
  publicDepartments: () => api.get('/public/departments').then((response) => response.data),
  departments: () => api.get('/departments').then((response) => response.data),
  addDepartment: (name) =>
    api.post('/departments', { name }).then((response) => response.data),
  department: (id) => api.get(`/departments/${id}`).then((response) => response.data),
  // Publishing appends a version rather than replacing topics. `acknowledge`
  // confirms the admin has seen which cohorts are mid-delivery and will keep the
  // list they started with; without it the API replies 409 with that list.
  updateCurriculum: (departmentId, items, { acknowledge = false } = {}) =>
    api
      .put(`/departments/${departmentId}/curriculum`, { items, acknowledge })
      .then((response) => response.data),
  // Instructors and heads of department share one set of endpoints — the two are
  // created, deactivated and reactivated identically.
  staff: () => api.get('/staff').then((response) => response.data),
  // One staff member as a person — the same shape `/me` answers, so the profile
  // page renders identically whether you are reading yourself or someone else.
  // 404 rather than 403 when they are outside the caller's scope.
  staffMember: (id) => api.get(`/staff/${id}`).then((response) => response.data),
  addStaff: (data) => api.post('/staff', data).then((response) => response.data),
  // A partial body is a partial update — only the keys sent are written. Moving
  // someone out of a department they hold active cohorts in answers 409 with those
  // cohorts listed; like `updateCurriculum`, that is a confirmation to relay rather
  // than a failure, and `acknowledge` re-submits past it.
  updateStaff: (id, data, { acknowledge = false } = {}) =>
    api.patch(`/staff/${id}`, { ...data, acknowledge }).then((response) => response.data),
  // 204 — nothing to return. It gives the person a way back in but does not sign
  // out the sessions they already have; tokens are stateless and last a day.
  resetStaffPassword: (id, newPassword) =>
    api.patch(`/staff/${id}/password`, { newPassword }),
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
  // `departmentId` is only needed by a head of department who heads more than one;
  // an instructor has exactly one, and the server fills it in. Omitted keys are
  // dropped from the JSON body, so passing nothing keeps the old behaviour.
  createCohort: (name, departmentId) =>
    api.post('/instructor/cohorts', { name, departmentId }).then((response) => response.data),
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
