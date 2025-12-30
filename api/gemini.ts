// api/gemini.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const config = { runtime: 'edge' };

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    tab1_quick: { type: SchemaType.STRING }, // Đáp án ngắn
    tab2_detail: { type: SchemaType.STRING }, // Lời giải chia dòng
    tab3_quiz: {
      type: SchemaType.OBJECT,
      properties: {
        question: { type: SchemaType.STRING },
        options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        correctIndex: { type: SchemaType.NUMBER },
        explanation: { type: SchemaType.STRING }
      },
      required: ["question", "options", "correctIndex", "explanation"]
    }
  },
  required: ["tab1_quick", "tab2_detail", "tab3_quiz"]
};

export default async function (req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { subject, prompt, image } = await req.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Bản chuẩn, tốc độ cao nhất
      generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const contents = [{
      role: "user",
      parts: [
        { text: `Bạn là chuyên gia môn ${subject}. Giải bài tập và tạo câu hỏi tương tự.` },
        { text: prompt || "Giải bài tập trong ảnh" },
        ...(image ? [{ inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] || image } }] : [])
      ]
    }];

    const result = await model.generateContent({ contents });
    return new Response(result.response.text(), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
