import { useState } from 'react';
import { mockCurriculum } from '../../data/mockCurriculum';
import CreateCohortModal from './CreateCohortModal'; // We'll build this next

const InstructorDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [curriculum, setCurriculum] = useState(mockCurriculum);

  const toggleTopic = (index) => {
    const newCurriculum = [...curriculum];
    newCurriculum[index].isCompleted = !newCurriculum[index].isCompleted;
    setCurriculum(newCurriculum);
  };

  const date = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  const dayName = dayNames[date.getDay()];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Instructor Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Managing: Web Development Beta</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-neo-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-100 hover:scale-105 transition-transform"
        >
          + Create New Cohort
        </button>
      </div>

      {/* Daily Tracker Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-neo-dark p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Today's Session ({dayName})</h2>
            <p className="text-slate-400 text-sm">AI-Generated Schedule</p>
          </div>
          <div className="text-right">
            <span className="text-neo-blue font-mono text-xl font-bold">{formattedDate}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Targets */}
          <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
            <h4 className="text-xs font-black text-neo-blue uppercase tracking-widest mb-1">Today's Target</h4>
            <p className="text-slate-700 font-medium">{curriculum[0].target}</p>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-500">Topics to Cover</h4>
            {curriculum[0].topics.map((topic, idx) => (
              <label key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <input 
                  type="checkbox" 
                  checked={curriculum[0].isCompleted} 
                  onChange={() => toggleTopic(0)}
                  className="w-5 h-5 rounded border-slate-300 text-neo-blue focus:ring-neo-blue"
                />
                <span className={`font-medium ${curriculum[0].isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {topic}
                </span>
              </label>
            ))}
          </div>

          <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition">
            Submit Daily Progress
          </button>
        </div>
      </div>

      {/* Modal Integration */}
      {isModalOpen && <CreateCohortModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default InstructorDashboard;