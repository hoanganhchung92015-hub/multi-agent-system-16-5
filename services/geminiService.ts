import { Subject, AiResponse } from '../types';

export const fetchAiSolution = async (subject: Subject, prompt: string, image?: string): Promise<AiResponse> => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, prompt, image })
  });

  if (!res.ok) throw new Error("AI không phản hồi, hãy thử lại!");
  return res.json();
};
