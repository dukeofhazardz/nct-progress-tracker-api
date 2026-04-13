const CreateCohortModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Create New Cohort</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-2xl">&times;</button>
        </div>
        
        <form className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Cohort Name</label>
            <input type="text" placeholder="e.g. Web Dev April 2026" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-neo-blue outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Number of Students</label>
            <input type="number" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-neo-blue outline-none" />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Curriculum Preview</h4>
            <p className="text-sm text-slate-600 italic">Curriculum will be automatically split into M/W/F sessions by AI upon creation.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-neo-blue text-white shadow-lg shadow-sky-100 hover:bg-sky-600 transition">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCohortModal;