
import React, { useState, useEffect, useRef } from 'react';
import { MCQ } from '../types';

interface MCQRoomProps {
  mcqs: MCQ[];
  onFinish: (results: { questionId: string; isCorrect: boolean; timeTaken: number; skipped?: boolean }[]) => void;
}

const QUESTION_TIME_LIMIT = 45;

export const MCQRoom: React.FC<MCQRoomProps> = ({ mcqs, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [results, setResults] = useState<{ questionId: string; isCorrect: boolean; timeTaken: number; skipped?: boolean }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(QUESTION_TIME_LIMIT);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNext(null, false); // Time's up!
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const handleNext = (optionIndex: number | null, skipped: boolean = false) => {
    const isCorrect = optionIndex === mcqs[currentIndex].correctAnswerIndex;
    const timeTaken = QUESTION_TIME_LIMIT - timeLeft;

    const newResults = [...results, { 
      questionId: mcqs[currentIndex].id, 
      isCorrect, 
      timeTaken,
      skipped
    }];

    if (currentIndex < mcqs.length - 1) {
      setResults(newResults);
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      onFinish(newResults);
    }
  };

  const currentMCQ = mcqs[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="h-2 bg-gray-100 w-full">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / mcqs.length) * 100}%` }}
          ></div>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest">
              Question {currentIndex + 1} of {mcqs.length}
            </span>
            <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl border-2 ${
              timeLeft < 10 ? 'border-red-500 text-red-600 animate-pulse' : 'border-indigo-100 text-indigo-600'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-mono font-bold">{timeLeft}s</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-tight">
            {currentMCQ.question}
          </h2>

          <div className="space-y-4 mb-10">
            {currentMCQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex items-center group ${
                  selectedOption === idx 
                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' 
                    : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 font-bold text-sm ${
                  selectedOption === idx ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`font-medium ${selectedOption === idx ? 'text-indigo-900' : 'text-gray-700'}`}>
                  {opt}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => handleNext(selectedOption)}
              disabled={selectedOption === null}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all transform active:scale-[0.98] ${
                selectedOption === null 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {currentIndex === mcqs.length - 1 ? 'Finish Screening Round' : 'Next Question'}
            </button>
            
            <button
              onClick={() => handleNext(null, true)}
              className="w-full py-3 rounded-2xl font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm uppercase tracking-widest"
            >
              Skip Question
            </button>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-gray-400 font-medium">
        Skipped questions are recorded as unattempted and do not contribute to your accuracy score.
      </p>
    </div>
  );
};