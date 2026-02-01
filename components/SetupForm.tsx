import React, { useState, useRef } from 'react';
import { UserContext, UserDifficulty } from '../types';

interface SetupFormProps {
  onStart: (context: UserContext) => void;
  isLoading: boolean;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart, isLoading }) => {
  const [role, setRole] = useState('Software Developer');
  const [difficulty, setDifficulty] = useState<UserDifficulty>(UserDifficulty.INTERMEDIATE);
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [resumeImage, setResumeImage] = useState<string | null>(null);
  const [resumeMimeType, setResumeMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setResumeImage(base64String);
        setResumeMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role && (resume || resumeImage) && jd) {
      onStart({ 
        role, 
        difficulty,
        resume: resume || "Provided via image", 
        jobDescription: jd,
        resumeImage: resumeImage || undefined,
        resumeImageMimeType: resumeMimeType || undefined
      });
    }
  };

  const clearImage = () => {
    setResumeImage(null);
    setResumeMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-8 py-12 text-white text-center">
        <h2 className="text-4xl font-black mb-2">Step 1: Build Your Profile</h2>
        <p className="text-indigo-100 opacity-90 max-w-xl mx-auto">Tell us about the target role and your experience level to generate a tailored interview experience.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Target Job Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium text-gray-900"
            >
              <option>Software Developer</option>
              <option>Data Analyst</option>
              <option>Cybersecurity Analyst</option>
              <option>Product Manager</option>
              <option>Cloud Engineer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Experience Level</label>
            <div className="flex bg-gray-50 p-1 rounded-xl border-2 border-gray-100">
              {Object.values(UserDifficulty).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs transition-all ${
                    difficulty === d ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Your Resume</label>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload Photo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {resumeImage ? (
              <div className="relative group rounded-2xl overflow-hidden border-2 border-indigo-100 bg-gray-50 h-72 shadow-inner">
                <img src={`data:${resumeMimeType};base64,${resumeImage}`} alt="Resume preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={clearImage} className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-600 shadow-xl transform hover:scale-105 transition-all">Replace File</button>
                </div>
              </div>
            ) : (
              <textarea 
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                className="w-full h-72 px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-indigo-500 focus:bg-white outline-none resize-none text-sm transition-all"
                placeholder="Paste the text from your resume here..."
                required={!resumeImage}
              />
            )}
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Job Description (JD)</label>
            <textarea 
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-72 px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-indigo-500 focus:bg-white outline-none resize-none text-sm transition-all"
              placeholder="Paste the target Job Description requirements here..."
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-2xl transition-all transform active:scale-[0.98] ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Initializing Interview Platform...
            </span>
          ) : 'Proceed to MCQ Screening Round →'}
        </button>
      </form>
    </div>
  );
};
