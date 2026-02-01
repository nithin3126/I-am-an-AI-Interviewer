
import React, { useState, useEffect, useRef } from 'react';
import { Question, Answer, PerformanceState, InterviewStage, UserContext } from '../types';
import { getCoachAdvice } from '../services/geminiService';

interface WaveformProps {
  stream: MediaStream;
}

const Waveform: React.FC<WaveformProps> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#fca5a5');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      audioContext.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={150} height={30} className="rounded-lg opacity-80" />;
};

interface InterviewRoomProps {
  performance: PerformanceState;
  currentQuestion: Question;
  onAnswer: (answer: Answer) => void;
  isProcessing: boolean;
  context: UserContext;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({ 
  performance, 
  currentQuestion, 
  onAnswer,
  isProcessing,
  context
}) => {
  const [answerText, setAnswerText] = useState('');
  const [timeLeft, setTimeLeft] = useState(currentQuestion.timeLimit);
  const [startTime, setStartTime] = useState(Date.now());
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState<{ type: string; message: string } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Coach State
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState<{ advice: string; type: 'HINT' | 'REPHRASE' } | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Unified Session Recording State (Video + Audio)
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const answerRef = useRef(answerText);
  const startTimeRef = useRef(startTime);

  useEffect(() => {
    answerRef.current = answerText;
  }, [answerText]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const stopRecordingAndGetData = async (): Promise<{ audio?: string; video?: string }> => {
    if (mediaRecorderRef.current && isRecording) {
      return new Promise((resolve) => {
        mediaRecorderRef.current!.onstop = async () => {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const base64 = await blobToBase64(blob);
          
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
          }
          
          setRecordedChunks([]);
          setIsRecording(false);
          resolve({ video: base64, audio: base64 });
        };
        mediaRecorderRef.current!.stop();
      });
    }
    return {};
  };

  const handleSubmit = async () => {
    const isTextEmpty = !answerRef.current.trim();
    if (isTextEmpty && !isRecording && timeLeft > 0) return;
    
    const { video, audio } = await stopRecordingAndGetData();
    
    const responseTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    onAnswer({
      questionId: currentQuestion.id,
      text: answerRef.current || (video ? "(Video response submitted)" : "(No response provided due to timeout)"),
      responseTime,
      audioData: audio,
      videoData: video
    });
    setAnswerText('');
    setCoachAdvice(null); // Clear coach advice for new question
  };

  const handleRequestCoach = async () => {
    setIsCoachLoading(true);
    setIsCoachOpen(true);
    const advice = await getCoachAdvice(context, currentQuestion);
    setCoachAdvice(advice);
    setIsCoachLoading(false);
  };

  useEffect(() => {
    setTimeLeft(currentQuestion.timeLimit);
    setStartTime(Date.now());
    setCoachAdvice(null); // Reset advice on new question
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion]);

  const startCamera = async () => {
    if (isCameraOn) {
      setCameraError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user' 
          },
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Error accessing webcam:", err);
        let errorData = { type: 'Hardware Error', message: 'Could not access camera hardware.' };
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorData = { type: 'Permission Denied', message: 'Please allow camera access.' };
        }
        setCameraError(errorData);
        setIsCameraOn(false);
      }
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;
      const tracks = [...audioStream.getTracks()];
      if (stream) {
        tracks.push(...stream.getTracks());
      }
      const combinedStream = new MediaStream(tracks);
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;
      setRecordedChunks([]);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };
      recorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Could not access microphone/camera for recording.");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingAndGetData();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOn]);

  const toggleCamera = () => {
    if (cameraError) {
      setCameraError(null);
      setIsCameraOn(true);
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'EASY': return 'bg-green-100 text-green-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700 relative overflow-hidden">
      
      {/* Left Sidebar - Status & Camera */}
      <div className="lg:w-1/4 space-y-6 shrink-0">
        <div className="space-y-3">
          <div className="bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-square relative border-4 border-white group transition-transform hover:scale-[1.02]">
            {isCameraOn ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${isRecording ? 'opacity-90' : 'opacity-100'}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${cameraError ? 'bg-red-500/10' : 'bg-white/5'}`}>
                  <svg className={`w-8 h-8 ${cameraError ? 'text-red-500' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    {!isCameraOn && <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />}
                  </svg>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${cameraError ? 'text-red-400' : 'text-gray-400'}`}>
                  {cameraError ? cameraError.type : 'Camera Standby'}
                </span>
              </div>
            )}
            
            {isRecording && (
              <div className="absolute inset-0 border-8 border-red-500/30 pointer-events-none animate-pulse"></div>
            )}

            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
               <div className={`w-1.5 h-1.5 rounded-full ${isCameraOn ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
               <span className="text-white text-[9px] font-black uppercase tracking-widest">
                 {isCameraOn ? 'Feed Live' : 'Offline'}
               </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-2">
               <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                 <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                 <span className="text-white text-[9px] font-black uppercase tracking-widest">
                   {isRecording ? 'REC' : 'Ready'}
                 </span>
               </div>
               
               {isRecording && audioStreamRef.current && (
                 <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                   <Waveform stream={audioStreamRef.current} />
                 </div>
               )}
            </div>
          </div>

          <button 
            onClick={toggleCamera}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-3 shadow-lg ${
              isCameraOn 
                ? 'bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {isCameraOn ? 'Privacy Mode' : 'Restore Camera'}
          </button>
        </div>

        {/* Assessment Path */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Assessment Path</h3>
          <div className="space-y-6">
            {Object.values(InterviewStage).map((s, idx) => {
              const isActive = performance.currentStage === s;
              const isCompleted = performance.history.some(h => h.question.stage === s);
              return (
                <div key={s} className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50' : 
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center - Main Interview Area */}
      <div className={`flex-1 space-y-6 transition-all duration-500 ${isCoachOpen ? 'lg:pr-[320px]' : ''}`}>
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden min-h-[600px] flex flex-col">
          <div className="absolute top-0 right-0 p-8 flex space-x-4 items-start">
             <button 
                onClick={() => setIsCoachOpen(!isCoachOpen)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isCoachOpen ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}
                title="AI Coach Assistance"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </button>
             <div className={`w-24 h-24 rounded-[2rem] flex flex-col items-center justify-center border-4 transition-all ${
               timeLeft < 30 ? 'border-red-500 text-red-600 bg-red-50 animate-pulse' : 'border-indigo-600 text-indigo-600'
             }`}>
               <span className="text-[9px] font-black uppercase tracking-tighter mb-1">Time Left</span>
               <span className="text-3xl font-mono font-black leading-none">{timeLeft}</span>
             </div>
          </div>

          <div className="mb-12 max-w-[80%]">
            <div className="flex items-center space-x-3 mb-6">
              <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty} Level
              </span>
              <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 uppercase tracking-widest">
                Round: {currentQuestion.stage}
              </span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 leading-tight tracking-tighter">
              {currentQuestion.text}
            </h2>
          </div>

          <div className="relative group flex-1 flex flex-col">
            <div className="flex justify-end mb-4 space-x-3">
              <button 
                onClick={toggleRecording}
                className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
                  isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-indigo-50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white animate-ping' : 'bg-indigo-600'}`} />
                <span>{isRecording ? 'Stop Recording' : 'Record Video'}</span>
              </button>
            </div>
            
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={isProcessing || timeLeft === 0}
              className="w-full flex-1 p-10 bg-gray-50 rounded-[3rem] border-4 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all text-xl font-medium leading-relaxed placeholder:text-gray-300 shadow-inner resize-none"
              placeholder="Outline your thoughts here..."
            />
            
            {isProcessing && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xl rounded-[3rem] flex flex-col items-center justify-center animate-in fade-in duration-300 z-20">
                <div className="flex space-x-3 mb-8">
                  <div className="w-5 h-5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-5 h-5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-5 h-5 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="font-black text-gray-900 text-2xl tracking-tighter">Evaluating...</p>
              </div>
            )}
          </div>

          <div className="mt-10 flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <div className="flex flex-col">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Response Draft</div>
                <div className="text-xl font-black text-gray-900">
                  {answerText.split(/\s+/).filter(x => x.length > 0).length} Words
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isProcessing || (timeLeft > 0 && !answerText.trim() && !isRecording)}
              className={`px-16 py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all transform active:scale-95 ${
                isProcessing || (timeLeft > 0 && !answerText.trim() && !isRecording)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Finish Round →
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - AI Coach (Collapsible) */}
      <div className={`fixed right-0 top-0 h-full w-[320px] bg-white border-l border-gray-100 shadow-2xl transform transition-transform duration-500 z-50 ${isCoachOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">AI Coach</h3>
            </div>
            <button onClick={() => setIsCoachOpen(false)} className="text-gray-400 hover:text-gray-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 space-y-6">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                Struggling with the current question? I can provide a nudge or rephrase it to make it clearer.
              </p>
            </div>

            <button 
              onClick={handleRequestCoach}
              disabled={isCoachLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center"
            >
              {isCoachLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <span>Thinking...</span>
                </div>
              ) : 'Get Guidance'}
            </button>

            {coachAdvice && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${coachAdvice.type === 'HINT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {coachAdvice.type}
                  </span>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm italic text-gray-700 text-sm leading-relaxed">
                  "{coachAdvice.advice}"
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-8 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center">Contextual Aid System v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
