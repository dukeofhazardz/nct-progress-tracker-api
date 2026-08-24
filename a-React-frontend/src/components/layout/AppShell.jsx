import { useState } from 'react';
import { useAuth } from '../../context/authContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const contextLabels = {
  ADMIN: 'Administration',
  HOD: 'Department management',
  INSTRUCTOR: 'Instructor workspace',
  STUDENT: 'Student progress',
};

/**
 * Admins and HODs have three nav destinations and get the sidebar. Instructor and
 * student have exactly one each, so they get a top bar only rather than 256px of
 * chrome holding a single link.
 */
export default function AppShell({ children }) {
  const { user } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const hasSidebar = user?.role === 'ADMIN' || user?.role === 'HOD';

  if (!hasSidebar) {
    return (
      <div className="min-h-screen bg-surface-sunken">
        <TopBar />
        <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onOpenNav={() => setIsNavOpen(true)} context={contextLabels[user?.role]} />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
