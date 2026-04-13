import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockDepartments } from '../../data/mockDepartment';

const DepartmentDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('cohorts'); // 'cohorts' or 'staffing'
  
  const dept = mockDepartments.find(d => d.id === parseInt(id));

  if (!dept) return <div className="p-10 text-center">Department not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <Link to="/admin/departments" className="hover:text-neo-blue transition-colors">Departments</Link>
        <span>/</span>
        <span className="text-slate-600">{dept.name}</span>
      </div>

      {/* Hero Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="text-5xl bg-slate-50 w-20 h-20 flex items-center justify-center rounded-2xl border border-slate-100 uppercase font-black text-neo-blue">
            {dept.name[0]}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">{dept.name}</h1>
            <p className="text-slate-500 font-bold">Total Personnel: <span className="text-slate-800">124 Students / 4 Instructors</span></p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('cohorts')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'cohorts' ? 'bg-white text-neo-blue shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            COHORTS & PROGRESS
          </button>
          <button 
            onClick={() => setActiveTab('staffing')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'staffing' ? 'bg-white text-neo-blue shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            INSTRUCTORS & STAFF
          </button>
        </div>
      </div>

      {/* Conditional Content */}
      {activeTab === 'cohorts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Your existing Cohort Table logic here */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Active Learning Groups</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Assigned Instructor</th>
                  <th className="px-6 py-4">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">Batch A - Morning</td>
                  <td className="px-6 py-4 font-medium text-slate-600">Israel Olajide</td>
                  <td className="px-6 py-4 font-black text-neo-blue">78%</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">Batch B - Evening</td>
                  <td className="px-6 py-4 font-medium text-slate-600">Sarah Connor</td>
                  <td className="px-6 py-4 font-black text-neo-blue">45%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
             <h3 className="font-black text-slate-800 uppercase text-sm mb-4">Dept Alerts</h3>
             <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold">
               ⚠️ Batch B is 2 days behind schedule on "Advanced CSS" topic.
             </div>
          </div>
        </div>
      ) : (
        /* Staffing View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Instructor Cards */}
         {/* Inside the staffing view map in DepartmentDetail.jsx */}
{dept.instructors.map((faculty) => (
  <div key={faculty.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 rounded-2xl bg-neo-dark flex items-center justify-center text-white font-black text-xl">
        {faculty.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <h4 className="font-black text-slate-800">{faculty.name}</h4>
        <p className="text-[10px] font-bold text-neo-blue uppercase tracking-widest">{faculty.role}</p>
      </div>
    </div>
    
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-bold uppercase">Active Cohorts</span>
        <span className="text-slate-800 font-black">{faculty.activeCohorts}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-bold uppercase">Rating</span>
        <span className="text-emerald-500 font-black">{faculty.rating}/5.0</span>
      </div>
    </div>
  </div>
))}

          {/* Add New Instructor Button */}
          <button className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-neo-blue hover:text-neo-blue transition-all group">
            <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">+</span>
            <span className="text-xs font-black uppercase tracking-widest">Assign New Instructor</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DepartmentDetail;