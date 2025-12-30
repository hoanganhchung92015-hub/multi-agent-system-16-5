import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  try {
    const { subject, prompt, image } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const parts: any[] = [{ text: `Bạn là giáo viên ${subject}. Hãy giải bài tập sau: ${prompt}` }];
    if (image) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] } });
    }

    const result = await model.generateContent(parts);
    return res.status(200).json(JSON.parse(result.response.text()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
