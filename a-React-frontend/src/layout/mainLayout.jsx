import { useAuth } from '../context/authContext';
import Sidebar from '../components/layout/Sidebar'; // We will build this next

const MainLayout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Persistent across all pages */}
      <Sidebar userRole={user?.role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="text-sm text-slate-500">
            NeoCloud / <span className="font-semibold text-slate-800 uppercase tracking-tight">{user?.role} Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.dept}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">
              <img 
                src="/NCT-logo.png" // Replace .png with your actual extension (.svg, .jpg, etc.)
                alt="NeoCloud Logo" 
                className="h-16 w-16 object-contain" // Limits height but keeps the logo's shape
            />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;