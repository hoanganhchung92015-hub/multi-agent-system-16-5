import { Subject } from './types';

// Định nghĩa Interface để Frontend hiểu cấu trúc dữ liệu trả về
export interface AiResponse {
  tab1_quick: string;
  tab2_detail: string;
  tab3_quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const cache = new Map<string, AiResponse>();

export const fetchAiSolution = async (
  subject: Subject, 
  prompt: string, 
  image?: string
): Promise<AiResponse> => {
  
  // 1. Tạo Key để lưu cache (tránh tốn tiền gọi AI nhiều lần cho cùng 1 câu hỏi)
  const cacheKey = btoa(encodeURIComponent(subject + prompt + (image ? 'img' : '')));
  if (cache.has(cacheKey)) {
    console.log("♻️ Lấy dữ liệu từ bộ nhớ đệm");
    return cache.get(cacheKey)!;
  }

  // 2. Gọi API Vercel Serverless
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, prompt, image })
  });

  // 3. Xử lý lỗi kết nối
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || "Chuyên gia đang bận, thử lại sau!");
  }

  const data: AiResponse = await res.json();

  // 4. Lưu vào cache trước khi trả về
  cache.set(cacheKey, data);
  
  return data;
};
