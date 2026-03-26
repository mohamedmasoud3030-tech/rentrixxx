export async function queryAssistant(apiKey: string, query: string, context: string): Promise<string> {
    if (!apiKey?.trim()) {
        throw new Error("Gemini API key is missing.");
    }

    const prompt = [
        "أنت مساعد ذكي لنظام إدارة عقارات.",
        "حلّل السؤال اعتمادًا على بيانات النظام المرفقة بصيغة JSON وأجب باختصار ووضوح باللغة العربية.",
        "",
        `سؤال المستخدم: ${query}`,
        "",
        `بيانات النظام (JSON): ${context}`
    ].join("\n");

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        }
    );

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini request failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Empty response from Gemini.");
    }

    return text;
}
