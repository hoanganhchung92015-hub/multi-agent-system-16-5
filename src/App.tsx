import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Subject, AiResponse } from './types';
import { fetchAiSolution } from './services/geminiService';
import 'katex/dist/katex.min.css';

export default function App() {
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'ANALYSIS'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [quizReady, setQuizReady] = useState(false);
  const [aiData, setAiData] = useState<AiResponse | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nén ảnh để gửi nhanh hơn
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  // Ghi âm tiếng Việt
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Trình duyệt không hỗ trợ giọng nói!");
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();
    recognition.onresult = (e: any) => setVoiceText(e.results[0][0].transcript);
  };

  const handleRunAnalysis = async () => {
    if (!selectedSubject || (!image && !voiceText)) return alert("Hãy cung cấp câu hỏi!");
    setScreen('ANALYSIS');
    setLoading(true);
    setQuizReady(false);
    setActiveTab(1);

    try {
      const finalImage = image ? await compressImage(image) : undefined;
      const data = await fetchAiSolution(selectedSubject, voiceText || "Giải bài tập này", finalImage);
      setAiData(data);
      setLoading(false);
      setTimeout(() => setQuizReady(true), 2500); // Tab 3 trễ 2.5s
    } catch (error: any) {
      alert(error.message);
      setScreen('INPUT');
    } finally { setLoading(false); }
  };

  const startCamera = async () => {
    setImage(null);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const capture = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setImage(canvas.toDataURL('image/jpeg'));
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-10">
      {screen === 'HOME' && (
        <div className="p-6 grid grid-cols-2 gap-4 pt-20">
          {[Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].map(sub => (
            <button key={sub} onClick={() => { setSelectedSubject(sub); setScreen('INPUT'); }} className="bg-blue-600 aspect-square rounded-[2rem] text-white font-bold shadow-lg uppercase">{sub}</button>
          ))}
        </div>
      )}

      {screen === 'INPUT' && (
        <div className="p-4 space-y-6">
          <div className="w-full aspect-square bg-black rounded-[2rem] overflow-hidden relative border-4 border-white shadow-xl">
            {image ? <img src={image} className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>
          <div className="flex justify-around bg-white p-4 rounded-2xl shadow-sm">
            <button onClick={startCamera} className="text-2xl">📸</button>
            <button onClick={() => fileInputRef.current?.click()} className="text-2xl">🖼️</button>
            <button onClick={handleVoiceInput} className="text-2xl">🎤</button>
            <input type="file" ref={fileInputRef} hidden onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { const reader = new FileReader(); reader.onload = () => setImage(reader.result as string); reader.readAsDataURL(file); }
            }} />
          </div>
          {voiceText && <div className="p-3 bg-blue-50 rounded-xl text-sm font-medium">🎤: {voiceText}</div>}
          <button onClick={image && !videoRef.current?.srcObject ? handleRunAnalysis : capture} className="w-full py-5 bg-blue-600 text-white rounded-full font-black shadow-lg">
            {image && !videoRef.current?.srcObject ? "GIẢI NGAY 🚀" : "CHỤP ẢNH 🎯"}
          </button>
        </div>
      )}

      {screen === 'ANALYSIS' && (
        <div className="p-4 space-y-4">
          <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
            {['ĐÁP ÁN', 'LỜI GIẢI', 'LUYỆN TẬP'].map((l, i) => (
              <button key={i} onClick={() => setActiveTab((i+1) as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === i+1 ? 'bg-white shadow-sm' : ''}`}>{l}</button>
            ))}
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-xl min-h-[400px]">
            {loading ? <div className="text-center py-20 animate-pulse uppercase font-bold text-blue-500">Chuyên gia đang giải...</div> : (
              <div className="animate-in fade-in duration-500">
                {activeTab === 1 && <div className="text-3xl font-black text-center text-blue-600"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiData?.tab1_quick || ""}</ReactMarkdown></div>}
                {activeTab === 2 && <div className="prose prose-sm"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiData?.tab2_detail || ""}</ReactMarkdown></div>}
                {activeTab === 3 && (
                  <div>
                    {!quizReady ? <div className="text-center py-20 italic text-amber-600 animate-bounce">Chuyên gia đang trao đổi...</div> : (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50 rounded-xl font-bold">{aiData?.tab3_quiz.question}</div>
                        {aiData?.tab3_quiz.options.map((opt, idx) => (
                          <button key={idx} onClick={() => setSelectedQuizIndex(idx)} className={`w-full text-left p-4 rounded-xl border-2 ${selectedQuizIndex === idx ? (idx === aiData.tab3_quiz.correctIndex ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : 'border-slate-100'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setScreen('HOME')} className="w-full text-slate-400 font-bold py-4">← QUAY LẠI</button>
        </div>
      )}
    </div>
  );
}
