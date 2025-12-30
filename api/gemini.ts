import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const config = {
  runtime: 'edge', // Tốc độ phản hồi nhanh nhất trên Vercel
  regions: ['sin1'], // Chỉ định server Singapore để gần Việt Nam nhất
};

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

export default async function (req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { subject, prompt, image } = await req.json();
    
    // Kiểm tra API Key sớm để tránh lãng phí tài nguyên
    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Thiếu API Key trên Vercel' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Flash là model nhanh nhất và bền nhất hiện nay
      generationConfig: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        temperature: 0.1, // Giảm độ sáng tạo để AI trả về JSON chuẩn xác, không bị lỗi cấu trúc
      }
    });

    const result = await model.generateContent([
      { text: `Giải bài tập ${subject} chuyên nghiệp. Tab 1 đáp án, Tab 2 lời giải chi tiết (Latex), Tab 3 trắc nghiệm tương tự.` },
      { text: prompt || "Giải bài tập" },
      ...(image ? [{ inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] } }] : [])
    ]);

    return new Response(result.response.text(), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600' // Cho phép Vercel cache kết quả nếu cùng input
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Hệ thống quá tải, vui lòng thử lại." }), { status: 500 });
  }
}
