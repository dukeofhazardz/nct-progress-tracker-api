import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/adminDashboard';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import StudentProgress from '../pages/Student/Studentprogress';
import MainLayout from '../layout/mainLayout';
import DepartmentDetail from '../pages/admin/departmentDetail';
import DisputesList from '../pages/admin/disputeList';
import DepartmentsList from '../pages/admin/departmentList';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />

      
      
      {/* Admin Protected */}
      <Route path="/admin" element={user?.role === 'ADMIN' ? <MainLayout><AdminDashboard /></MainLayout> : <Navigate to="/login" />} />

      <Route path="/admin/department/:id" element={<MainLayout><DepartmentDetail /></MainLayout>} />

      <Route path="/admin/disputes" element={user?.role === 'ADMIN' ? <MainLayout><DisputesList /></MainLayout> : <Navigate to="/login" />} />

      <Route path="/admin/departments" element={<MainLayout><DepartmentsList /></MainLayout>} />

      {/* Instructor Protected */}
      <Route path="/instructor" element={user?.role === 'INSTRUCTOR' ? <MainLayout><InstructorDashboard /></MainLayout> : <Navigate to="/login" />} />

      {/* Student Protected */}
      <Route path="/student" element={user?.role === 'STUDENT' ? <MainLayout><StudentProgress /></MainLayout> : <Navigate to="/login" />} />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes;