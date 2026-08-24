import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { homePathFor } from './homePath';
import AppShell from '../components/layout/AppShell';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/adminDashboard';
import DepartmentDetail from '../pages/admin/departmentDetail';
import DisputesList from '../pages/admin/disputeList';
import StaffList from '../pages/admin/StaffList';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import StudentProgress from '../pages/Student/Studentprogress';

const Protected = ({ roles }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
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
        element={user ? <Navigate to={homePathFor(user.role)} replace /> : <Login />}
      />

      <Route element={<Protected roles={['ADMIN', 'HOD']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/department/:id" element={<DepartmentDetail />} />
        <Route path="/admin/disputes" element={<DisputesList />} />
        <Route path="/admin/staff" element={<StaffList />} />
      </Route>

      <Route element={<Protected roles={['INSTRUCTOR']} />}>
        <Route path="/instructor" element={<InstructorDashboard />} />
      </Route>

      <Route element={<Protected roles={['STUDENT']} />}>
        <Route path="/student" element={<StudentProgress />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
