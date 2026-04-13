import { useAuth } from '../../context/authContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Sidebar = ({ userRole }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // This tells us which URL is currently active

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Added 'path' to each item so the Link knows where to go
  const menuItems = {
    ADMIN: [
    { name: 'Overview', icon: '📊', path: '/admin' },
    { name: 'Departments', icon: '🏢', path: '/admin/departments' }, // New Path
    { name: 'Disputes', icon: '⚠️', path: '/admin/disputes' }
    ],
    INSTRUCTOR: [
      { name: 'My Cohorts', icon: '👥', path: '/instructor' },
      { name: 'Daily Tracker', icon: '📅', path: '/instructor' },
      { name: 'Curriculum', icon: '📚', path: '/instructor' }
    ],
    STUDENT: [
      { name: 'My Progress', icon: '📈', path: '/student' },
      { name: 'Resources', icon: '📂', path: '/student' },
      { name: 'Log Dispute', icon: '💬', path: '/student' }
    ]
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Logo Section */}
      
        <div className="p-6 border-b border-slate-800 flex flex-col items-center">
            <img 
            src="/NCT-logo2.png" 
            alt="NeoCloud Technologies" 
            className=" object-contain size-50" 
            />
            <span className="text-[10px] font-black text-neo-blue tracking-[0.2em] mt-2 uppercase">
                Tracker
            </span>
        </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 mt-6 px-4 space-y-2">
        {menuItems[userRole]?.map((item) => {
          // Check if this specific item is the active page
          const isActive = location.pathname === item.path;

          return (
            <Link 
              key={item.name}
              to={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-neo-blue text-white shadow-lg shadow-sky-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-semibold text-sm tracking-wide">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/20"
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;



