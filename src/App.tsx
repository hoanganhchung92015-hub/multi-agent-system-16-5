import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Subject, AiResponse } from './types';
import { fetchAiSolution } from '../services/geminiService';
import 'katex/dist/katex.min.css';

export default function App() {
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'ANALYSIS' | 'DIARY'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [quizReady, setQuizReady] = useState(false);
  const [aiData, setAiData] = useState<AiResponse | null>(null);
  
  // States cho Input
  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- XỬ LÝ GỬI DỮ LIỆU ---
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedSubject || (!image && !voiceText)) return;
    
    setScreen('ANALYSIS');
    setLoading(true);
    setQuizReady(false);
    setAiData(null);
    setActiveTab(1);

    try {
      const data = await fetchAiSolution(selectedSubject, voiceText || "Giải bài tập", image || undefined);
      setAiData(data);
      setLoading(false); // Tab 1, 2 hiện ngay

      // Tab 3 trễ 2s tạo hiệu ứng "Chuyên gia đang trao đổi"
      setTimeout(() => setQuizReady(true), 2000);
    } catch (error) {
      alert("Lỗi kết nối chuyên gia!");
      setScreen('INPUT');
      setLoading(false);
    }
  }, [selectedSubject, image, voiceText]);

  // --- HÀM TIỆN ÍCH ---
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-10">
      {/* MÀN HÌNH CHỌN MÔN & NHẬT KÝ */}
      {screen === 'HOME' && (
        <div className="p-6 space-y-8">
          <h1 className="text-2xl font-black text-blue-600 text-center mt-10">GIÁO VIÊN AI</h1>
          <div className="grid grid-cols-2 gap-4">
            {[Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].map(sub => (
              <button key={sub} onClick={() => { setSelectedSubject(sub); setScreen('INPUT'); }} className="bg-blue-600 aspect-square rounded-[2rem] text-white font-bold text-xl shadow-lg active:scale-95 transition-all uppercase">{sub}</button>
            ))}
            <button onClick={() => setScreen('DIARY')} className="bg-amber-400 aspect-square rounded-[2rem] text-white font-bold text-xl shadow-lg flex flex-col items-center justify-center">
              <span>📓</span><span className="text-sm">NHẬT KÝ</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH NHẬP LIỆU: CAMERA, TẢI ẢNH, MICRO */}
      {screen === 'INPUT' && (
        <div className="p-4 space-y-6">
          <div className="flex justify-between items-center px-2">
             <button onClick={() => setScreen('HOME')} className="text-slate-400 font-bold">← QUAY LẠI</button>
             <span className="font-black text-blue-600 uppercase">{selectedSubject}</span>
          </div>

          <div className="w-full aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden relative shadow-2xl border-4 border-white">
            {image ? <img src={image} className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>

          <div className="flex justify-around items-center bg-white p-6 rounded-[2rem] shadow-sm">
            <button onClick={startCamera} className="flex flex-col items-center gap-1">
              <span className="text-3xl">📸</span><span className="text-[10px] font-bold text-slate-400">CHỤP ẢNH</span>
            </button>
            <input type="file" ref={fileInputRef} hidden onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }} />
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1">
              <span className="text-3xl">🖼️</span><span className="text-[10px] font-bold text-slate-400">TẢI ẢNH</span>
            </button>
            <button onClick={() => setVoiceText("Tính diện tích hình tròn...")} className="flex flex-col items-center gap-1">
              <span className="text-3xl">🎤</span><span className="text-[10px] font-bold text-slate-400">GIỌNG NÓI</span>
            </button>
          </div>

          <button onClick={image ? capture : handleRunAnalysis} className={`w-full py-5 rounded-full font-black text-white shadow-xl transition-all ${image ? 'bg-blue-600' : 'bg-emerald-600 animate-pulse'}`}>
            {image ? "XÁC NHẬN ẢNH ✔" : "GỬI YÊU CẦU 🚀"}
          </button>
        </div>
      )}

      {/* MÀN HÌNH KẾT QUẢ (3 TAB) */}
      {screen === 'ANALYSIS' && (
        <div className="p-4 space-y-4">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
            {['ĐÁP ÁN', 'LỜI GIẢI', 'LUYỆN TẬP'].map((label, i) => (
              <button key={i} onClick={() => setActiveTab((i+1) as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeTab === i+1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl min-h-[400px]">
            {loading ? (
              <div className="text-center py-20 animate-pulse font-black text-blue-500 uppercase">Chuyên gia đang giải...</div>
            ) : (
              <div className="animate-in fade-in duration-500">
                {activeTab === 1 && <div className="text-4xl font-black text-center text-blue-600 py-10"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiData?.tab1_quick || ""}</ReactMarkdown></div>}
                {activeTab === 2 && <div className="prose prose-sm"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiData?.tab2_detail || ""}</ReactMarkdown></div>}
                {activeTab === 3 && (
                  <div>
                    {!quizReady ? (
                      <div className="text-center py-20 italic text-amber-600 font-bold animate-bounce text-sm">Chuyên gia đang trao đổi...</div>
                    ) : (
                      <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <div className="p-4 bg-amber-50 rounded-2xl font-bold border-l-4 border-amber-400">{aiData?.tab3_quiz.question}</div>
                        {aiData?.tab3_quiz.options.map((opt, idx) => (
                          <button key={idx} onClick={() => setSelectedQuizIndex(idx)} className={`w-full text-left p-4 rounded-xl border-2 font-bold transition-all ${selectedQuizIndex === idx ? (idx === aiData.tab3_quiz.correctIndex ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : 'border-slate-100'}`}>
                            {String.fromCharCode(65+idx)}. {opt}
                          </button>
                        ))}
                        {selectedQuizIndex !== null && <div className="p-4 bg-blue-50 rounded-xl text-xs leading-relaxed border border-blue-100 italic"><b>Giải thích:</b> {aiData?.tab3_quiz.explanation}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setScreen('INPUT')} className="w-full py-4 text-slate-400 font-bold">THỬ CÂU KHÁC</button>
        </div>
      )}
    </div>
  );
}
