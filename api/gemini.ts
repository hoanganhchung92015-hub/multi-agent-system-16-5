import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    tab1_quick: { type: SchemaType.STRING }, // Đáp án cuối cùng
    tab2_detail: { type: SchemaType.STRING }, // Lời giải chi tiết LaTeX
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { subject, prompt, image } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const result = await model.generateContent([
      { text: `Bạn là giáo viên chuyên về ${subject}. 
               Nhiệm vụ 1: Giải bài tập được cung cấp (Tab 1: Đáp số ngắn, Tab 2: Lời giải chi tiết dùng LaTeX).
               Nhiệm vụ 2: Tạo 1 câu hỏi trắc nghiệm tương tự để học sinh luyện tập thêm kiến thức này (Tab 3).` },
      { text: prompt },
      ...(image ? [{ inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] } }] : [])
    ]);

    return res.status(200).json(JSON.parse(result.response.text()));
  } catch (err: any) {
    return res.status(500).json({ error: "Lỗi hệ thống AI" });
  }
}
