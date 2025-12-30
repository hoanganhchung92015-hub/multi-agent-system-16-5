import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Cấu trúc Schema chuẩn để AI trả về JSON
const schema = {
  type: SchemaType.OBJECT,
  properties: {
    tab1_quick: { type: SchemaType.STRING },
    tab2_detail: { type: SchemaType.STRING },
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
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subject, prompt, image } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing API Key");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { 
        responseMimeType: "application/json", 
        responseSchema: schema 
      }
    });

    // Tạo nội dung gửi cho AI
    const parts: any[] = [
      { text: `Bạn là chuyên gia giáo dục môn ${subject}. Giải bài tập và tạo câu hỏi tương tự.` },
      { text: prompt || "Giải bài tập trong ảnh" }
    ];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image.split(",")[1] || image
        }
      });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const responseText = result.response.text();
    
    // Trả về dữ liệu JSON cho Frontend
    return res.status(200).json(JSON.parse(responseText));

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
