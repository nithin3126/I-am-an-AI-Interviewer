
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, MCQ_PROMPT, COACH_PROMPT } from "../constants";
import { UserContext, PerformanceState, Question, Answer, InterviewStage, Difficulty, MCQ } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeJobAndResume = async (context: UserContext) => {
  const model = 'gemini-3-flash-preview';
  const textPart = {
    text: `${ANALYSIS_PROMPT}\n\nRole: ${context.role}\nJD: ${context.jobDescription}\nResume Text: ${context.resume}`
  };
  const parts: any[] = [textPart];
  if (context.resumeImage && context.resumeImageMimeType) {
    parts.push({ inlineData: { data: context.resumeImage, mimeType: context.resumeImageMimeType } });
  }
  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};

export const generateMCQs = async (context: UserContext): Promise<MCQ[]> => {
  const model = 'gemini-3-flash-preview';
  const prompt = `${MCQ_PROMPT}\n\nRole: ${context.role}\nTarget Difficulty: ${context.difficulty}`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(response.text || '{"mcqs": []}');
    return data.mcqs;
  } catch (error) {
    console.error("MCQ Generation Error:", error);
    return [];
  }
};

export const getNextStep = async (
  context: UserContext,
  performance: PerformanceState,
  lastAnswer?: Answer
) => {
  const model = 'gemini-3-flash-preview';
  const historyString = performance.history.map(h => 
    `Q: ${h.question.text}\nA: ${h.answer.text}\nScore: ${h.answer.score}\nFeedback: ${h.answer.feedback}`
  ).join('\n\n');

  const prompt = `
    User Context:
    Role: ${context.role} | Difficulty: ${context.difficulty}
    MCQ Accuracy: ${performance.mcqScores.filter(s => s.isCorrect).length}/5
    Resume Analysis: ${JSON.stringify(performance.skillsAnalysis)}
    
    Current Progress:
    Stage: ${performance.currentStage} | Difficulty: ${performance.currentDifficulty}
    
    Interview History:
    ${historyString}
    
    ${lastAnswer ? `LATEST ANSWER TO EVALUATE: "${lastAnswer.text}" (Time Taken: ${lastAnswer.responseTime}s)` : "Start the interview with the INTRODUCTION stage (resume-based)."}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Next Step Error:", error);
    return null;
  }
};

export const getCoachAdvice = async (context: UserContext, currentQuestion: Question) => {
  const model = 'gemini-3-flash-preview';
  const prompt = `
    Role: ${context.role}
    Question: ${currentQuestion.text}
    Stage: ${currentQuestion.stage}
    Difficulty: ${currentQuestion.difficulty}
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        systemInstruction: COACH_PROMPT,
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Coach Advice Error:", error);
    return { advice: "I'm here to support you! Try breaking the problem down into smaller steps.", type: "HINT" };
  }
};

export const generateFinalReport = async (context: UserContext, performance: PerformanceState) => {
  const model = 'gemini-3-pro-preview';
  const mcqScore = (performance.mcqScores.filter(s => s.isCorrect).length / 5) * 100;
  const interviewAvg = performance.history.reduce((acc, h) => acc + (h.answer.score || 0), 0) / (performance.history.length || 1) * 10;
  
  const prompt = `
    Final Evaluation for: ${context.role}
    Section Performance:
    - Resume Score: ${performance.skillsAnalysis?.score || 0}
    - MCQ Score: ${mcqScore}
    - Interview Avg (out of 100): ${interviewAvg}

    Detailed History:
    ${performance.history.map(h => `[${h.question.stage}] Q: ${h.question.text} | A: ${h.answer.text} | Score: ${h.answer.score}`).join('\n')}

    Output a JSON report with:
    - overallScore (0-100 weighted average)
    - readiness (STRONG, AVERAGE, NEEDS_IMPROVEMENT)
    - sectionScores (resume, mcq, interview)
    - strengths (array)
    - weaknesses (mistakes and weak areas)
    - suggestions (actionable improvement tips)
    - hiringIndicator (summary verdict)
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 } 
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Final Report Error:", error);
    return null;
  }
};
