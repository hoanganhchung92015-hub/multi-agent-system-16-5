// services/geminiService.ts
const cache = new Map<string, any>();

export const fetchAiSolution = async (subject: string, prompt: string, image?: string) => {
  // Tạo key cache dựa trên nội dung câu hỏi
  const cacheKey = btoa(encodeURIComponent(subject + prompt + (image ? 'img' : '')));
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, prompt, image })
  });

  if (!res.ok) throw new Error("Chuyên gia đang bận, thử lại sau!");
  
  const data = await res.json();
  cache.set(cacheKey, data);
  return data;
};
