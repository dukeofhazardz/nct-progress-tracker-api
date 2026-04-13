const DisputeModal = ({ topic, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Log a Dispute</h3>
          <p className="text-sm text-slate-500 mt-1">Topic: <span className="font-bold text-neo-blue">{topic}</span></p>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Please explain why you are flagging this topic. This report will be sent directly to the <span className="font-bold">Admin</span> for review.
          </p>
          
          <textarea 
            rows="4" 
            placeholder="Example: The instructor did not mention this topic today, or we spent the whole time on a different subject..."
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-400 outline-none transition-all resize-none text-sm"
          ></textarea>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button 
              className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600 transition"
            >
              Submit Dispute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisputeModal;