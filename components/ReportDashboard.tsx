
import React from 'react';
import { PerformanceState, FinalReport } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface ReportDashboardProps {
  report: FinalReport;
  performance: PerformanceState;
  onReset: () => void;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ report, performance, onReset }) => {
  const radarData = [
    { subject: 'Resume', A: report.sectionScores.resume, fullMark: 100 },
    { subject: 'MCQ', A: report.sectionScores.mcq, fullMark: 100 },
    { subject: 'Interview', A: report.sectionScores.interview, fullMark: 100 },
  ];

  const readinessColor = {
    'STRONG': 'text-green-600 bg-green-50 border-green-200',
    'AVERAGE': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'NEEDS_IMPROVEMENT': 'text-red-600 bg-red-50 border-red-200'
  }[report.readiness];

  const handlePrint = () => {
    window.print();
  };

  const downloadMedia = (data: string, filename: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTranscript = () => {
    const transcript = performance.history.map((h, i) => (
      `ROUND ${i + 1} (${h.question.stage})\n` +
      `Question: ${h.question.text}\n` +
      `Answer: ${h.answer.text}\n` +
      `Score: ${h.answer.score}/10\n` +
      `Feedback: ${h.answer.feedback}\n` +
      `-------------------------------------------\n`
    )).join('\n');
    
    const header = `INTERVIEW REPORT: ${report.readiness}\nOverall Score: ${report.overallScore}\n\n`;
    const blob = new Blob([header + transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom duration-700 pb-20 print-container">
      {/* Action Header - Hidden in Print */}
      <div className="flex justify-between items-center no-print bg-indigo-900 p-6 rounded-[2.5rem] text-white shadow-2xl">
        <div>
          <h3 className="text-xl font-black tracking-tighter uppercase">Export & Share</h3>
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Final Assessment Complete</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={downloadTranscript}
            className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Transcript</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-2 px-8 py-3 bg-white text-indigo-900 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-xl transform hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Final Verdict Section */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-600 to-blue-600 no-print"></div>
        <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Interview Performance</h2>
        <p className="text-gray-500 mb-10 text-lg font-medium">Comprehensive evaluation based on resume, screening, and adaptive interview.</p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-16 mb-6">
          <div className="relative">
            <svg className="w-56 h-56 transform -rotate-90">
              <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-gray-100" />
              <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="20" fill="transparent" strokeDasharray={2 * Math.PI * 100} strokeDashoffset={2 * Math.PI * 100 * (1 - report.overallScore / 100)} className="text-indigo-600 transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-gray-900">{report.overallScore}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Weighted Score</span>
            </div>
          </div>

          <div className="text-left space-y-6 max-w-md">
            <div className={`inline-block px-8 py-3 rounded-2xl border-2 font-black text-sm tracking-widest uppercase ${readinessColor}`}>
              Hiring Status: {report.readiness}
            </div>
            <p className="text-2xl text-gray-800 font-bold leading-tight">"{report.hiringIndicator}"</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
          {Object.entries(report.sectionScores).map(([name, score]) => (
            <div key={name} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <span className="block text-3xl font-black text-indigo-600">{score}%</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
          <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tighter">Performance Spectrum</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{fill: '#4b5563', fontWeight: 'bold'}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                <Radar name="Performance" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Improvement Strategy */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col justify-center">
           <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tighter">Improvement Strategy</h3>
           <div className="space-y-4">
              {report.suggestions.map((s, idx) => (
                <div key={idx} className="flex items-start p-4 bg-indigo-50 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mr-4 font-black text-sm">{idx+1}</div>
                  <p className="text-indigo-900 font-bold text-sm leading-relaxed">{s}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Strengths & Weaknesses Detailed Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Key Strengths</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Validated Skills</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {report.strengths.map((s, i) => (
              <div key={i} className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-green-200 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-10 bg-green-500 rounded-full opacity-20 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-gray-800 font-bold text-lg leading-tight">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Growth Areas</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Points of Improvement</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {report.weaknesses.map((w, i) => (
              <div key={i} className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-red-200 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-10 bg-red-500 rounded-full opacity-20 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-gray-800 font-bold text-lg leading-tight">{w}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Archive - Video & Audio Recordings */}
      <div className="no-print space-y-8 pt-8">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Session Archive</h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Recordings & Transcripts Available</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {performance.history.map((item, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col group transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Round {idx + 1}: {item.question.stage}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    (item.answer.score ?? 0) >= 8 ? 'bg-green-100 text-green-700' : 
                    (item.answer.score ?? 0) >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.answer.score}
                  </div>
                </div>
                <h5 className="text-gray-900 font-bold text-sm mb-4 leading-tight line-clamp-2 min-h-[2.5rem]">
                  {item.question.text}
                </h5>
              </div>

              {item.answer.videoData ? (
                <div className="px-8 mb-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900 shadow-inner group-hover:ring-4 group-hover:ring-indigo-50 transition-all">
                    <video 
                      src={item.answer.videoData} 
                      className="w-full h-full object-cover"
                      poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"
                      onClick={(e) => (e.target as HTMLVideoElement).paused ? (e.target as HTMLVideoElement).play() : (e.target as HTMLVideoElement).pause()}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>
              ) : item.answer.audioData ? (
                <div className="px-8 mb-4">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /></svg>
                    </div>
                    <audio src={item.answer.audioData} controls className="flex-1 h-8" />
                  </div>
                </div>
              ) : (
                <div className="px-8 mb-4">
                  <div className="h-[120px] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 italic text-xs">
                    <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    Media track not available
                  </div>
                </div>
              )}

              <div className="p-8 pt-0 mt-auto">
                <button 
                  onClick={() => {
                    if (item.answer.videoData) downloadMedia(item.answer.videoData, `round-${idx+1}-video.webm`);
                    else if (item.answer.audioData) downloadMedia(item.answer.audioData, `round-${idx+1}-audio.webm`);
                  }}
                  disabled={!item.answer.videoData && !item.answer.audioData}
                  className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                  <span>Save Recording</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col items-center pt-16 no-print">
        <button 
          onClick={onReset}
          className="group relative px-20 py-7 bg-gray-900 text-white font-black text-2xl rounded-[2.5rem] hover:bg-black transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] transform hover:scale-105 active:scale-95"
        >
          <span className="relative z-10 flex items-center">
            Start New Assessment
            <svg className="w-6 h-6 ml-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </span>
          <div className="absolute inset-0 rounded-[2.5rem] bg-indigo-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
        </button>
        <p className="mt-8 text-gray-400 font-bold uppercase tracking-widest text-xs">Session Logged • Data Encryption Active</p>
      </div>
    </div>
  );
};
