import React, { useState, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { Subject } from './types';
import { Layout } from '../components/Layout';
import { fetchAiSolution } from '../services/geminiService';

// Định nghĩa kiểu dữ liệu đồng bộ với API
interface AiResponse {
  tab1_quick: string;
  tab2_detail: string;
  tab3_quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'ANALYSIS'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<AiResponse | null>(null);
  const [quizReady, setQuizReady] = useState(false); // Trạng thái chờ cho Tab 3

  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- LOGIC XỬ LÝ CHÍNH ---
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedSubject || (!image && !voiceText)) return;
    
    setScreen('ANALYSIS');
    setLoading(true);
    setAiData(null);
    setQuizReady(false); 
    setSelectedQuizIndex(null);
    setActiveTab(1);

    try {
      const data = await fetchAiSolution(selectedSubject, voiceText || "Giải bài tập trong ảnh", image || undefined);
      setAiData(data);
      
      // Tạo độ trễ giả lập 2 giây cho Tab 3 tạo cảm giác "AI đang soạn bài"
      setTimeout(() => {
        setQuizReady(true);
      }, 2000);

    } catch (error) {
      console.error("Lỗi:", error);
      alert("Hệ thống đang bận, vui lòng thử lại!");
      setScreen('INPUT');
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, image, voiceText]);

  // --- CAMERA & CHỤP ẢNH ---
  const startCamera = async () => {
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Không thể mở camera. Hãy cấp quyền!"); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setImage(canvasRef.current.toDataURL('image/jpeg'));
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <Layout 
      onBack={() => setScreen(screen === 'ANALYSIS' ? 'INPUT' : 'HOME')} 
      title={selectedSubject || "GIÁO VIÊN AI"}
    >
      {/* 1. MÀN HÌNH CHỌN MÔN */}
      {screen === 'HOME' && (
        <div className="grid grid-cols-2 gap-4 mt-10 p-4 animate-in fade-in zoom-in duration-300">
          {[Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].map(sub => (
            <button 
              key={sub} 
              onClick={() => { setSelectedSubject(sub); setScreen('INPUT'); }}
              className="bg-blue-600 aspect-square rounded-[2.5rem] text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all"
            >
              <span className="text-xl font-black uppercase tracking-widest">{sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* 2. MÀN HÌNH NHẬP LIỆU */}
      {screen === 'INPUT' && (
        <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
          <div className="w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden relative border-4 border-white shadow-2xl">
             {image ? <img src={image} className="w-full h-full object-contain" alt="capture" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>
          <div className="flex justify-center gap-4">
            <button onClick={startCamera} className="p-5 bg-slate-100 rounded-full text-2xl shadow-md">📸</button>
            <button onClick={capturePhoto} className="p-5 bg-blue-600 rounded-full text-2xl text-white shadow-lg shadow-blue-200">🎯</button>
            <button onClick={handleRunAnalysis} className="px-10 py-5 bg-emerald-600 text-white rounded-full font-black shadow-lg uppercase tracking-wider">GIẢI NGAY</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* 3. MÀN HÌNH KẾT QUẢ (3 TAB) */}
      {screen === 'ANALYSIS' && (
        <div className="p-4 space-y-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shadow-inner">
            {[
              { id: 1, label: 'ĐÁP ÁN', icon: '⚡' },
              { id: 2, label: 'LỜI GIẢI', icon: '📝' },
              { id: 3, label: 'LUYỆN TẬP', icon: '🧠' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeTab === tab.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-50 min-h-[480px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center pt-24 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black text-blue-500 animate-pulse uppercase">Chuyên gia đang giải bài...</p>
              </div>
            ) : aiData && (
              <div className="animate-in fade-in duration-500">
                {activeTab === 1 && (
                  <div className="text-center py-10 space-y-6">
                    <div className="text-4xl font-black text-blue-600 leading-tight">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {aiData.tab1_quick}
                      </ReactMarkdown>
                    </div>
                    <div className="inline-block px-4 py-1 bg-blue-50 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">Kết quả chính xác</div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="prose prose-blue prose-sm max-w-none text-slate-700 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {aiData.tab2_detail}
                    </ReactMarkdown>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="space-y-6">
                    {!quizReady ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-amber-600 italic">Đang soạn câu hỏi luyện tập...</p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-5 bg-amber-50 rounded-[2rem] border-2 border-amber-100 font-bold text-slate-800 mb-6">
                          {aiData.tab3_quiz.question}
                        </div>
                        <div className="grid gap-3">
                          {aiData.tab3_quiz.options.map((opt, idx) => {
                            const isSelected = selectedQuizIndex === idx;
                            const isCorrect = idx === aiData.tab3_quiz.correctIndex;
                            let style = "border-slate-100 bg-slate-50/50";
                            if (selectedQuizIndex !== null) {
                              if (isCorrect) style = "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20";
                              else if (isSelected) style = "border-red-500 bg-red-50 text-red-700";
                            }
                            return (
                              <button
                                key={idx}
                                disabled={selectedQuizIndex !== null}
                                onClick={() => setSelectedQuizIndex(idx)}
                                className={`w-full text-left p-5 rounded-2xl border-2 font-bold transition-all active:scale-95 ${style}`}
                              >
                                <span className="opacity-30 mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                              </button>
                            );
                          })}
                        </div>
                        {selectedQuizIndex !== null && (
                          <div className="mt-6 p-5 bg-blue-600 rounded-[2rem] text-white shadow-xl animate-in zoom-in-95">
                            <p className="text-[10px] font-black uppercase opacity-60 mb-1">Giải thích từ chuyên gia</p>
                            <p className="text-sm leading-relaxed">{aiData.tab3_quiz.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
