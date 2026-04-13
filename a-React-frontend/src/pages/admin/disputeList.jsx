import { useState } from 'react';

const mockDisputes = [
  { id: 1, student: "Israel Olajide", dept: "Web Development", topic: "React Hooks", reason: "Instructor skipped the practical session.", status: "PENDING", date: "2026-04-10" },
  { id: 2, student: "Jane Smith", dept: "Data Science", topic: "Neural Networks", reason: "Class was cancelled without notice.", status: "RESOLVED", date: "2026-04-08" },
  { id: 3, student: "Kevin Hart", dept: "Cybersecurity", topic: "SQL Injection", reason: "The labs were not accessible during class.", status: "PENDING", date: "2026-04-12" },
];

const DisputesList = () => {
  const [filter, setFilter] = useState('ALL');

  const filteredDisputes = filter === 'ALL' 
    ? mockDisputes 
    : mockDisputes.filter(d => d.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Master Dispute Log</h1>
          <p className="text-slate-500 text-sm font-medium">Review and resolve student feedback across all departments.</p>
        </div>

        {/* Status Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {['ALL', 'PENDING', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                filter === s ? 'bg-white text-neo-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Student & Dept</th>
              <th className="px-6 py-4">Topic Flagged</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDisputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5">
                  <p className="font-bold text-slate-800">{dispute.student}</p>
                  <p className="text-[10px] font-bold text-neo-blue uppercase">{dispute.dept}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm font-medium text-slate-700">{dispute.topic}</p>
                  <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{dispute.reason}"</p>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-slate-500">
                  {dispute.date}
                </td>
                <td className="px-6 py-5 text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                    dispute.status === 'PENDING' 
                    ? 'bg-red-50 text-red-500 border border-red-100' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {dispute.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisputesList;