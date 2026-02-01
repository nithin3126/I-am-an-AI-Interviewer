
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { SetupForm } from './components/SetupForm';
import { InterviewRoom } from './components/InterviewRoom';
import { MCQRoom } from './components/MCQRoom';
import { ReportDashboard } from './components/ReportDashboard';
import { 
  UserContext, 
  PerformanceState, 
  Question, 
  Answer, 
  InterviewStage, 
  Difficulty,
  FinalReport,
  MCQ
} from './types';
import { 
  analyzeJobAndResume, 
  generateMCQs,
  getNextStep, 
  generateFinalReport 
} from './services/geminiService';

const INITIAL_PERFORMANCE: PerformanceState = {
  currentStage: InterviewStage.INTRODUCTION,
  currentDifficulty: Difficulty.EASY,
  mcqScores: [],
  completedQuestions: 0,
  totalScore: 0,
  history: []
};

const App: React.FC = () => {
  const [view, setView] = useState<'SETUP' | 'MCQ' | 'INTERVIEW' | 'REPORT'>('SETUP');
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [performance, setPerformance] = useState<PerformanceState>(INITIAL_PERFORMANCE);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startAssessment = async (context: UserContext) => {
    setIsProcessing(true);
    setUserContext(context);
    
    const [analysis, generatedMcqs] = await Promise.all([
      analyzeJobAndResume(context),
      generateMCQs(context)
    ]);

    setPerformance({ ...INITIAL_PERFORMANCE, skillsAnalysis: analysis });
    setMcqs(generatedMcqs);
    setView('MCQ');
    setIsProcessing(false);
  };

  const handleMCQFinish = async (results: { questionId: string; isCorrect: boolean; timeTaken: number }[]) => {
    setIsProcessing(true);
    const updatedPerformance = { ...performance, mcqScores: results };
    setPerformance(updatedPerformance);

    if (userContext) {
      const step = await getNextStep(userContext, updatedPerformance);
      if (step && step.nextQuestion) {
        setCurrentQuestion({
          id: Math.random().toString(36).substr(2, 9),
          ...step.nextQuestion
        });
        setView('INTERVIEW');
      }
    }
    setIsProcessing(false);
  };

  const handleInterviewAnswer = async (answer: Answer) => {
    if (!userContext || !currentQuestion) return;
    setIsProcessing(true);

    const step = await getNextStep(userContext, performance, answer);
    
    if (step) {
      const { evaluation, nextQuestion, isInterviewComplete } = step;
      
      const updatedHistory = [
        ...performance.history, 
        { 
          question: currentQuestion, 
          answer: { ...answer, score: evaluation.score, feedback: evaluation.feedback } 
        }
      ];

      const newPerformance: PerformanceState = {
        ...performance,
        history: updatedHistory,
        completedQuestions: performance.completedQuestions + 1,
        totalScore: performance.totalScore + (evaluation.score || 0),
        currentStage: isInterviewComplete ? performance.currentStage : nextQuestion.stage,
        currentDifficulty: isInterviewComplete ? performance.currentDifficulty : nextQuestion.difficulty
      };

      setPerformance(newPerformance);

      if (isInterviewComplete) {
        const finalReport = await generateFinalReport(userContext, newPerformance);
        setReport(finalReport);
        setView('REPORT');
      } else {
        setCurrentQuestion({
          id: Math.random().toString(36).substr(2, 9),
          ...nextQuestion
        });
      }
    }
    setIsProcessing(false);
  };

  const reset = () => {
    setView('SETUP');
    setUserContext(null);
    setPerformance(INITIAL_PERFORMANCE);
    setCurrentQuestion(null);
    setMcqs([]);
    setReport(null);
  };

  return (
    <Layout>
      {view === 'SETUP' && (
        <div className="py-12">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest mb-4">Elite Interview Simulation</span>
            <h1 className="text-7xl font-black text-gray-900 mb-6 tracking-tighter">I am an AI Interviewer</h1>
            <p className="text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
              Professional-grade technical assessments. Experience real-time adaptive questioning, MCQ screening, and comprehensive feedback.
            </p>
          </div>
          <SetupForm onStart={startAssessment} isLoading={isProcessing} />
        </div>
      )}

      {view === 'MCQ' && (
        <MCQRoom mcqs={mcqs} onFinish={handleMCQFinish} />
      )}

      {view === 'INTERVIEW' && currentQuestion && userContext && (
        <InterviewRoom 
          performance={performance}
          currentQuestion={currentQuestion}
          onAnswer={handleInterviewAnswer}
          isProcessing={isProcessing}
          context={userContext}
        />
      )}

      {view === 'REPORT' && report && (
        <ReportDashboard 
          report={report} 
          performance={performance} 
          onReset={reset} 
        />
      )}
    </Layout>
  );
};

export default App;
