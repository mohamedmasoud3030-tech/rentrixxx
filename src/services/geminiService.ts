import { GoogleGenAI } from '@google/genai';

export async function queryAssistant(apiKey: string, query: string, context: string): Promise<string> {
    if (!apiKey) {
        throw new Error("مفتاح Gemini API غير موجود. يرجى إضافته في الإعدادات.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `أنت مساعد ذكي متخصص في إدارة العقارات. لديك البيانات التالية:

${context}

سؤال المستخدم: ${query}

أجب بشكل واضح ومفيد باللغة العربية.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const text = response.text;
    if (!text) {
        throw new Error("لم يتم الحصول على رد من المساعد الذكي.");
    }

    return text;
}
