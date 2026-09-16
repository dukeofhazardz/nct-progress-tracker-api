import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { homePathFor } from './homePath';
import AppShell from '../components/layout/AppShell';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/adminDashboard';
import DepartmentDetail from '../pages/admin/departmentDetail';
import DisputesList from '../pages/admin/disputeList';
import StaffList from '../pages/admin/StaffList';
import StaffProfile from '../pages/admin/StaffProfile';
import StudentList from '../pages/admin/StudentList';
import StudentProfile from '../pages/admin/StudentProfile';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import MyProfile from '../pages/profile/MyProfile';
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
        <Route path="/admin/staff/:id" element={<StaffProfile />} />
        {/* Both pages are scoped by the server: a head of department is answered
            only the students holding a membership in a department they head, and a
            student outside that set is 404 rather than 403. */}
        <Route path="/admin/students" element={<StudentList />} />
        <Route path="/admin/students/:id" element={<StudentProfile />} />
      </Route>

      {/* Every staff role reaches their own profile from the user menu. The
          endpoints behind it key off the token rather than the role, so the guard
          is the only thing deciding who is offered the page. Students are out:
          they have no profile screen yet. */}
      <Route element={<Protected roles={['ADMIN', 'HOD', 'INSTRUCTOR']} />}>
        <Route path="/profile" element={<MyProfile />} />
      </Route>

      {/* A head of department can hold and deliver cohorts of their own, using the
          same workspace an instructor uses. Every route behind it filters on the
          caller's id, so they only ever see their own. */}
      <Route element={<Protected roles={['INSTRUCTOR', 'HOD']} />}>
        <Route path="/instructor" element={<InstructorDashboard />} />
      </Route>

      <Route element={<Protected roles={['STUDENT']} />}>
        <Route path="/student" element={<StudentProgress />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
