import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Subject } from './types';
import { Layout } from '../components/Layout';
// Import dịch vụ mới đã nâng cấp
import { fetchAiSolution } from '../services/geminiService';

// Định nghĩa kiểu dữ liệu cho 3 Tab
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
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'ANALYSIS' | 'DIARY'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  
  // States cho dữ liệu
  const [aiData, setAiData] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  
  // State cho trắc nghiệm (Tab 3)
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);

  // Refs cho Camera & Audio
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- HÀNH ĐỘNG CHÍNH: GIẢI BÀI ---
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedSubject || (!image && !voiceText)) return;
    
    setScreen('ANALYSIS');
    setLoading(true);
    setAiData(null);
    setSelectedQuizIndex(null);
    setActiveTab(1);

    try {
      const data = await fetchAiSolution(selectedSubject, voiceText || "Giải bài tập trong ảnh", image || undefined);
      setAiData(data);
    } catch (error) {
      alert("Chuyên gia đang bận, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, image, voiceText]);

  // --- CAMERA LOGIC (Giữ nguyên phần cứng của bạn) ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Không thể mở camera"); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setImage(canvasRef.current.toDataURL('image/jpeg'));
      // Tắt camera sau khi chụp
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  return (
    <Layout 
      onBack={() => setScreen(screen === 'ANALYSIS' ? 'INPUT' : 'HOME')} 
      title={selectedSubject || "AI Giáo Viên"}
    >
      {/* MÀN HÌNH CHỌN MÔN */}
      {screen === 'HOME' && (
        <div className="grid grid-cols-2 gap-4 mt-10 p-4">
          {[Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].map(sub => (
            <button 
              key={sub} 
              onClick={() => { setSelectedSubject(sub); setScreen('INPUT'); }}
              className="bg-blue-600 aspect-square rounded-[2.5rem] text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <span className="text-xl font-bold">{sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* MÀN HÌNH NHẬP LIỆU */}
      {screen === 'INPUT' && (
        <div className="p-4 space-y-6">
          <div className="w-full aspect-video bg-slate-100 rounded-3xl overflow-hidden relative border-2 border-dashed border-slate-300">
             {image ? (
               <img src={image} className="w-full h-full object-contain" />
             ) : (
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
             )}
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={startCamera} className="p-4 bg-slate-200 rounded-full text-2xl">📸</button>
            <button onClick={capturePhoto} className="p-4 bg-blue-600 rounded-full text-2xl text-white">🎯</button>
            <button onClick={handleRunAnalysis} className="px-8 py-4 bg-emerald-600 text-white rounded-full font-bold shadow-lg">GIẢI NGAY 🚀</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* MÀN HÌNH PHÂN TÍCH (3 TAB) */}
      {screen === 'ANALYSIS' && (
        <div className="p-4 space-y-4">
          {/* Header Tab chuyên nghiệp */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            {[
              { id: 1, label: 'ĐÁP ÁN NHANH', icon: '⚡' },
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

          {/* Nội dung Tab */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full pt-20 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-blue-500 animate-pulse">CHUYÊN GIA ĐANG PHÂN TÍCH...</p>
              </div>
            ) : aiData && (
              <div className="animate-in fade-in duration-500">
                {/* TAB 1: ĐÁP ÁN NHANH */}
                {activeTab === 1 && (
                  <div className="text-center space-y-4">
                    <div className="text-4xl font-black text-blue-600 py-10">
                       <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                         {aiData.tab1_quick}
                       </ReactMarkdown>
                    </div>
                    <p className="text-slate-400 text-xs italic">Kết quả được tính toán dựa trên dữ liệu chuẩn THPT QG</p>
                  </div>
                )}

                {/* TAB 2: LỜI GIẢI CHI TIẾT */}
                {activeTab === 2 && (
                  <div className="prose prose-blue prose-sm max-w-none whitespace-pre-line leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {aiData.tab2_detail}
                    </ReactMarkdown>
                  </div>
                )}

                {/* TAB 3: LUYỆN TẬP TƯƠNG TỰ */}
                {activeTab === 3 && (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-2xl border-l-4 border-amber-400 font-bold text-slate-800">
                      {aiData.tab3_quiz.question}
                    </div>
                    <div className="grid gap-3">
                      {aiData.tab3_quiz.options.map((opt, idx) => {
                        const isSelected = selectedQuizIndex === idx;
                        const isCorrect = idx === aiData.tab3_quiz.correctIndex;
                        let btnStyle = "border-slate-200 text-slate-700 bg-white";
                        
                        if (selectedQuizIndex !== null) {
                          if (isCorrect) btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-500";
                          else if (isSelected) btnStyle = "border-red-500 bg-red-50 text-red-700";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={selectedQuizIndex !== null}
                            onClick={() => setSelectedQuizIndex(idx)}
                            className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-[0.98] ${btnStyle}`}
                          >
                            <span className="opacity-40 mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Phản hồi sau khi chọn */}
                    {selectedQuizIndex !== null && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-2xl animate-in zoom-in-95 duration-300">
                        <p className="text-xs font-black text-blue-600 uppercase mb-1">Giải thích từ chuyên gia:</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{aiData.tab3_quiz.explanation}</p>
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
