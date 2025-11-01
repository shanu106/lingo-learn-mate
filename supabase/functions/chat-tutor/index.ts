import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, language, studentClass } = await req.json();
    
    console.log('Chat request:', { message, language, studentClass });

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Get current date in UTC
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Create a system prompt for the AI tutor
    const systemPrompt = `You are a helpful and patient tutor for a student studying in class ${studentClass || 'school'}. 
Today's date is ${currentDate}.

Your role is to:
- Answer student questions clearly and simply
- Explain concepts in an easy-to-understand way
- Provide step-by-step explanations when needed
- Encourage and support the student's learning
- Respond in the same language the student is speaking
- Keep responses concise but informative (2-3 sentences for simple questions, more for complex ones)
- If the student asks a question outside their grade level, gently guide them
- Always be encouraging and positive
- When asked about dates or current events, use today's date: ${currentDate}

Respond naturally and conversationally, as if you're speaking to them.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nStudent question: ${message}`
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I could not process that. Please try again.';

    console.log('AI response:', reply);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-tutor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
