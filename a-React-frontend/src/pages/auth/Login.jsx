import { useState } from 'react';
import { useAuth } from '../../context/authContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // MOCK LOGIN LOGIC
    // In a real app, you'd call the backend here. 
    // For now, let's pretend any email with 'admin' becomes an Admin, etc.
    let role = 'STUDENT';
    if (email.includes('admin')) role = 'ADMIN';
    if (email.includes('inst')) role = 'INSTRUCTOR';

    const mockUser = {
      id: Date.now(),
      name: email.split('@')[0], // Use part of email as name
      role: role,
      dept: "Web Development"
    };

    login(mockUser);
    navigate(`/${role.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 pt-12 text-center">
          <div className="inline-block p-4 rounded-2xl bg-sky-50 mb-4">
            <img 
                src="/NCT-logo.png" // Replace .png with your actual extension (.svg, .jpg, etc.)
                alt="NeoCloud Logo" 
                className="h-16 w-auto object-contain" // Limits height but keeps the logo's shape
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 text-sm mt-2">Sign in to track your training progress</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 pt-0 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@neocloud.com" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-neo-blue outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-neo-blue outline-none transition-all"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-neo-blue text-white py-4 rounded-xl font-bold shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all active:scale-95"
          >
            Sign In to Dashboard
          </button>

          <div className="pt-4 text-center">
            <p className="text-xs text-slate-400">
              Test hint: use <span className="font-bold">admin@nct.com</span> or <span className="font-bold">inst@nct.com</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;