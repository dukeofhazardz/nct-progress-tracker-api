import { useState } from 'react';

const CurriculumUpload = () => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleProcess = () => {
    setIsProcessing(true);
    // Simulate AI delay
    setTimeout(() => {
      setIsProcessing(false);
      setPreview(true); // This would show the AI-split results
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Curriculum Processor</h1>
        <p className="text-slate-500">Paste the department curriculum below. Our AI will split it into a 4-month M/W/F schedule.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Side */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Raw Curriculum Text</label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Week 1: Intro to HTML... Week 2: CSS Flexbox..."
            className="w-full h-[400px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none font-mono text-sm"
          ></textarea>
          
          <button 
            onClick={handleProcess}
            disabled={!text || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
              isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-100'
            }`}
          >
            {isProcessing ? 'AI is Processing...' : '✨ Generate AI Schedule'}
          </button>
        </div>

        {/* Preview Side */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white min-h-[500px] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">AI Preview Output</h3>
          
          {!preview && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="text-5xl text-slate-700 italic font-serif">" "</div>
              <p className="text-slate-500">The generated schedule will appear here after processing.</p>
            </div>
          )}

          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-brand-600 font-medium animate-pulse">Analyzing topics and dates...</p>
            </div>
          )}

          {preview && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-brand-600 text-xs font-bold uppercase">Week 1 - Monday</span>
                <p className="font-bold text-lg">Introduction to Web Standards</p>
                <ul className="text-sm text-slate-400 mt-2 list-disc list-inside">
                  <li>HTTP/HTTPS Basics</li>
                  <li>Browser Engines</li>
                </ul>
              </div>
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 opacity-60">
                <span className="text-slate-500 text-xs font-bold uppercase">Week 1 - Wednesday</span>
                <p className="font-bold text-lg">HTML5 Semantic Structure</p>
              </div>
              <button className="w-full mt-4 border border-brand-600 text-brand-600 py-3 rounded-xl font-bold hover:bg-brand-600 hover:text-white transition-all">
                Approve & Publish to Instructors
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumUpload;