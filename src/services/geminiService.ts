// Gemini AI service - dynamically imported to avoid ESM issues
let GoogleGenerativeAI: any = null;

export async function queryAssistant(apiKey: string, query: string, context: string): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API key is required.");
    }

    try {
        // Lazy load the module to avoid ESM compatibility issues
        if (!GoogleGenerativeAI) {
            const module = await import('@google/genai');
            GoogleGenerativeAI = module.GoogleGenerativeAI || (module as any).default;
        }
        
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = context 
            ? `Context:\n${context}\n\nQuery:\n${query}`
            : query;
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        if (!text) {
            throw new Error("Empty response from Gemini API");
        }
        
        return text;
    } catch (error: any) {
        const errorMessage = error?.message || "Failed to get a response from the AI assistant.";
        throw new Error(errorMessage);
    }
}