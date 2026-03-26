// This file is now a proxy to the Electron main process for handling Gemini API calls.

// TypeScript declaration for the API exposed by the preload script.
declare global {
    interface Window {
        electronAPI: {
            queryGemini: (query: string, context: string) => Promise<{success: boolean, text?: string, error?: string}>
        }
    }
}


export async function queryAssistant(apiKey: string, query: string, context: string): Promise<string> {
    // The apiKey is no longer used in the frontend but is kept for signature compatibility.
    // The actual API key is now securely handled in the Electron main process.
    
    if (!window.electronAPI?.queryGemini) {
        throw new Error("Gemini AI integration is not available in this environment (electronAPI not found).");
    }

    const response = await window.electronAPI.queryGemini(query, context);

    if (!response.success || !response.text) {
        // The error message from the main process will be more specific (e.g., invalid API key).
        throw new Error(response.error || "Failed to get a response from the AI assistant.");
    }

    return response.text;
}