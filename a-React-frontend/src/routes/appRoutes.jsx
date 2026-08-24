import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import AppShell from '../components/layout/AppShell';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/adminDashboard';
import DepartmentDetail from '../pages/admin/departmentDetail';
import DisputesList from '../pages/admin/disputeList';
import InstructorsList from '../pages/admin/InstructorsList';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import StudentProgress from '../pages/Student/Studentprogress';

const Protected = ({ role }) => {
  const { user } = useAuth();

  if (user?.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={`/${user.role.toLowerCase()}`} /> : <Login />}
      />

      <Route element={<Protected role="ADMIN" />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/department/:id" element={<DepartmentDetail />} />
        <Route path="/admin/disputes" element={<DisputesList />} />
        <Route path="/admin/instructors" element={<InstructorsList />} />
      </Route>

      <Route element={<Protected role="INSTRUCTOR" />}>
        <Route path="/instructor" element={<InstructorDashboard />} />
      </Route>

      <Route element={<Protected role="STUDENT" />}>
        <Route path="/student" element={<StudentProgress />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
