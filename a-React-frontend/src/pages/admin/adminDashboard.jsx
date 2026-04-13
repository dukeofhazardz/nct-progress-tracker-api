import { mockDepartments } from '../../data/mockDepartment';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Department Overview</h1>
        <button className="bg-neo-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-600 transition">
          + Add Department
        </button>
      </div>

      {/* Grid of 10+ Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDepartments.map((dept) => (
         <Link 
         to={`/admin/department/${dept.id}`} 
         key={dept.id} 
         className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-neo-blue transition-all"
         >
            <div key={dept.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div className="text-3xl">{dept.icon}</div>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {dept.cohorts} Cohorts
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800">{dept.name}</h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">Lead: {dept.instructor}</p>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Course Progress</span>
                <span>{dept.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-neo-blue h-full transition-all duration-500" 
                  style={{ width: `${dept.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
         </Link>
         
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;