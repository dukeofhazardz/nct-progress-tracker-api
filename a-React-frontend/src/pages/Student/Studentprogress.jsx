import { useState } from 'react';
import { mockCurriculum } from '../../data/mockCurriculum';
import DisputeModal from './DisputeModal';

const StudentProgress = () => {
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const openDispute = (topic) => {
    setSelectedTopic(topic);
    setIsDisputeOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header & Overall Stats */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-800">Your Learning Journey</h1>
          <p className="text-slate-500 font-medium">Department: Web Development</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-black text-neo-blue">75%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p>
          </div>
          <div className="w-0.5 h-10 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-3xl font-black text-neo-success">12/48</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classes Done</p>
          </div>
        </div>
      </div>

      {/* The Roadmap/Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-700 px-2">Course Timeline</h2>
        
        {mockCurriculum.map((item, index) => (
          <div key={index} className="relative pl-8 pb-8 group">
            {/* Timeline Line */}
            {index !== mockCurriculum.length - 1 && (
              <div className="absolute left-2.75 top-6 w-0.5 h-full bg-slate-200 group-hover:bg-neo-blue transition-colors"></div>
            )}
            
            {/* Timeline Dot */}
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm transition-colors ${item.isCompleted ? 'bg-neo-success' : 'bg-slate-300'}`}></div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-neo-blue transition-all">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">{item.day} • {item.date}</span>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">{item.topics.join(", ")}</h3>
                </div>

                {item.isCompleted ? (
                  <button 
                    onClick={() => openDispute(item.topics[0])}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                  >
                    ⚠️ Log Dispute
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-lg italic">
                    Upcoming Class
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isDisputeOpen && (
        <DisputeModal 
          topic={selectedTopic} 
          onClose={() => setIsDisputeOpen(false)} 
        />
      )}
    </div>
  );
};

export default StudentProgress;