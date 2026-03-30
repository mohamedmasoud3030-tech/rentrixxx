const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error('Assistant is not configured');
    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    const context = typeof body.context === 'string' ? body.context : JSON.stringify(body.context || {});
    if (!prompt) throw new Error('Prompt is required');

    const fullPrompt = `أنت مساعد ذكي متخصص في إدارة العقارات. لديك البيانات التالية:\n\n${context}\n\nسؤال المستخدم: ${prompt}\n\nأجب بشكل واضح ومفيد باللغة العربية.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed: ${text}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response text from model');

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
