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
    const { topic, language, grade } = await req.json();
    
    if (!topic || !language || !grade) {
      throw new Error('Missing required fields: topic, language, grade');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Language-specific system prompts
    const languagePrompts: Record<string, string> = {
      'en': 'You are a helpful teacher assistant creating educational content.',
      'hi': 'आप एक सहायक शिक्षक सहायक हैं जो शैक्षिक सामग्री बना रहे हैं।',
      'mr': 'तुम्ही एक सहाय्यक शिक्षक सहाय्यक आहात जो शैक्षणिक सामग्री तयार करत आहात.',
      'bn': 'আপনি একজন সহায়ক শিক্ষক সহায়ক যা শিক্ষামূলক বিষয়বস্তু তৈরি করছে।',
      'te': 'మీరు విద్యా కంటెంట్ సృష్టించే సహాయక ఉపాధ్యాయ సహాయకులు.',
      'ta': 'நீங்கள் கல்வி உள்ளடக்கத்தை உருவாக்கும் உதவி ஆசிரியர் உதவியாளர்.',
    };

    const systemPrompt = languagePrompts[language] || languagePrompts['en'];

    const userPrompt = `Create a lesson about "${topic}" for ${grade} students. 
    Respond in ${language} language.
    
    Generate EXACTLY 3 lesson steps in JSON format:
    1. One explanation step
    2. Two question steps with answers
    
    Format:
    {
      "title": "lesson title in ${language}",
      "steps": [
        {
          "type": "explanation",
          "content": "explanation text in ${language}",
          "question": null,
          "answer": null
        },
        {
          "type": "question",
          "content": "question text in ${language}",
          "question": "short question in ${language}",
          "answer": "correct answer"
        },
        {
          "type": "question",
          "content": "question text in ${language}",
          "question": "short question in ${language}",
          "answer": "correct answer"
        }
      ]
    }`;

    console.log('Calling AI with language:', language);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('AI response received');
    
    let lessonData;
    try {
      lessonData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    return new Response(JSON.stringify(lessonData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lesson:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
