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

    const userPrompt = `Create an educational lesson about "${topic}" for ${grade} students. 
    Respond in ${language} language.
    
    IMPORTANT: Make the content appropriate for ${grade} level:
    - For Grade 1-3: Use simple words, basic concepts, short sentences
    - For Grade 4-6: Use moderate vocabulary, introduce more concepts
    - For Grade 7-9: Use advanced vocabulary, deeper explanations
    - For Grade 10-12: Use college-prep level content, complex reasoning
    
    Generate EXACTLY 6 lesson steps in JSON format:
    1. One explanation step (introduce the topic)
    2. One reading step (detailed content with examples)
    3. One question step
    4. One reading step (deeper dive or related concepts)
    5. Two question steps (progressively harder)
    
    Format:
    {
      "title": "lesson title in ${language}",
      "steps": [
        {
          "type": "explanation",
          "content": "brief introduction to ${topic} appropriate for ${grade}",
          "question": null,
          "answer": null
        },
        {
          "type": "reading",
          "content": "detailed content with examples, facts, and context (3-5 paragraphs) appropriate for ${grade}",
          "question": null,
          "answer": null
        },
        {
          "type": "question",
          "content": "question context in ${language}",
          "question": "simple question about the reading appropriate for ${grade}",
          "answer": "correct answer"
        },
        {
          "type": "reading",
          "content": "more advanced content building on previous concepts (2-3 paragraphs) appropriate for ${grade}",
          "question": null,
          "answer": null
        },
        {
          "type": "question",
          "content": "question context in ${language}",
          "question": "moderate difficulty question appropriate for ${grade}",
          "answer": "correct answer"
        },
        {
          "type": "question",
          "content": "question context in ${language}",
          "question": "challenging question that tests understanding appropriate for ${grade}",
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
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests. Please wait a moment and try again, or upgrade for higher limits.' 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
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
