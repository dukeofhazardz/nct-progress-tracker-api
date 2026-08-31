import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import Avatar from '../ui/Avatar';

const roleLabels = {
  ADMIN: 'Administrator',
  HOD: 'Head of Department',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

/**
 * A HOD can head several departments and a student can study in several, so the
 * subtitle names one department but counts more than one.
 */
const departmentLabel = (user) => {
  const departments = user?.departments ?? [];
  if (departments.length > 1) return `${departments.length} departments`;
  return departments[0]?.name || user?.dept || roleLabels[user?.role];
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-sunken"
      >
        <Avatar
          src={user?.avatarUrl}
          avatar={user?.avatar}
          name={user?.name}
          fallback="NCT"
          className="h-8 w-8 text-xs"
          fallbackClassName="bg-brand-600 text-white"
        />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-semibold text-ink">{user?.name}</span>
          <span className="block truncate text-xs text-ink-subtle">{departmentLabel(user)}</span>
        </span>
        <ChevronDown size={14} className="hidden text-ink-faint sm:block" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
        >
          <div className="border-b border-line px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink-subtle">@{user?.username}</p>
            <p className="mt-1.5 text-xs font-medium text-brand-700">
              {roleLabels[user?.role] || user?.role}
            </p>
          </div>
          {/* Students have no profile screen, so they are not offered the link. */}
          {user?.role !== 'STUDENT' && (
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 border-b border-line px-3.5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <UserCircle size={15} aria-hidden="true" />
              Your profile
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
