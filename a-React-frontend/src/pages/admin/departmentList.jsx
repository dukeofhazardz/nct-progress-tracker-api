import { Link } from 'react-router-dom';
import { mockDepartments } from '../../data/mockDepartment';

const DepartmentsList = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Organization Departments</h1>
        <p className="text-slate-500 text-sm font-medium">Manage faculty and monitor instructor assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDepartments.map((dept) => (
          <Link 
            to={`/admin/department/${dept.id}`} 
            key={dept.id}
            className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-neo-blue hover:shadow-xl hover:shadow-sky-900/5 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl bg-slate-50 p-3 rounded-2xl group-hover:bg-sky-50 transition-colors">
                {dept.icon}
              </span>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">
                {dept.cohorts} Cohorts
              </span>
            </div>
            
            <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-neo-blue transition-colors">
              {dept.name}
            </h3>
            
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Lead Instructor</span>
                <span className="text-slate-700 font-black">{dept.instructor}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-neo-blue h-full transition-all duration-500" 
                  style={{ width: `${dept.progress}%` }}
                ></div>
              </div>
            </div>

            <button className="w-full mt-6 py-3 rounded-xl bg-slate-50 text-neo-blue text-xs font-black uppercase tracking-widest group-hover:bg-neo-blue group-hover:text-white transition-all">
              Manage Instructors
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsList;