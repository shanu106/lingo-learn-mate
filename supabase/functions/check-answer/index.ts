import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userAnswer, correctAnswer, language } = await req.json();
    
    if (!userAnswer || !correctAnswer || !language) {
      throw new Error('Missing required fields');
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Check if answer is correct with Google Gemini API - more flexible matching
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful teacher checking student answers. Be VERY FLEXIBLE with student answers. Accept answers that have the same meaning even if worded differently. Accept similar concepts and alternative explanations.

Correct answer: ${correctAnswer}
Student answer: ${userAnswer}

Respond in JSON format in ${language} language:
{
  "isCorrect": true or false (be lenient - if the meaning is similar, mark as correct),
  "feedback": "brief encouraging feedback in ${language} (max 2 sentences)"
}`
          }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data));
    
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-answer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
