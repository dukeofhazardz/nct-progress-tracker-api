import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Flag, LayoutDashboard, LogOut, Users, X } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import initials from '../../utils/initials';
import Brand from './Brand';

/**
 * `match` is explicit rather than a prefix test because every management route
 * starts with `/admin` — a naive `startsWith` would light up Dashboard everywhere.
 *
 * Admins and HODs share these destinations and these URLs. The server scopes a
 * HOD's data to the departments they head, so the same pages show less.
 */
const managementMenu = [
  {
    name: 'Departments',
    path: '/admin',
    icon: LayoutDashboard,
    match: (path) => path === '/admin' || path.startsWith('/admin/department'),
  },
  {
    name: 'Disputes',
    path: '/admin/disputes',
    icon: Flag,
    match: (path) => path.startsWith('/admin/disputes'),
  },
  {
    name: 'Staff',
    path: '/admin/staff',
    icon: Users,
    match: (path) => path.startsWith('/admin/staff'),
  },
];

const menus = { ADMIN: managementMenu, HOD: managementMenu };

const roleLabels = {
  ADMIN: 'Administrator',
  HOD: 'Head of Department',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = menus[user?.role] ?? [];

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const panel = (
    <aside className="flex h-full w-64 flex-col border-r border-white/5 bg-surface-inverse">
      <div className="flex h-16 shrink-0 items-center border-b border-white/5 px-4">
        <Brand onDark className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(location.pathname);
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 px-1 pb-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
            {initials(user?.name, 'NCT')}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/45">{roleLabels[user?.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{panel}</div>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-surface-inverse/70"
            onClick={onClose}
            aria-label="Close navigation"
          />
          <div className="relative h-full w-64">{panel}</div>
        </div>
      )}
    </>
  );
}
