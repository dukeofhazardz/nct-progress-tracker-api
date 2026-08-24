import axiosInstance from '../axiosInstance';

export const adminService = {
  // Get all 10+ departments
  getDepartments: async () => {
    const response = await axiosInstance.get('/departments');
    return response.data;
  },

  // Upload the curriculum text for AI to process
  uploadCurriculum: async (deptId, curriculumText) => {
    const response = await axiosInstance.post(`/departments/${deptId}/curriculum`, {
      text: curriculumText
    });
    return response.data;
  }
};