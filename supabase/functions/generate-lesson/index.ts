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

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
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

    const userPrompt = `Create an educational lesson about "${topic}" for ${grade} students following NCERT curriculum standards.
    Respond in ${language} language.
    
    CRITICAL - Match content complexity to ${grade} NCERT level:
    - Grade 1-2: Very basic concepts, single digit numbers, simple words (3-5 letters), picture book level
    - Grade 3-4: Basic arithmetic, short paragraphs, simple sentences, foundational concepts
    - Grade 5-6: Multi-digit numbers, longer paragraphs, vocabulary building, introductory science
    - Grade 7-8: Pre-algebra, essay paragraphs, abstract thinking starts, detailed explanations
    - Grade 9-10: Algebra/geometry, complex paragraphs, critical thinking, NCERT board exam prep
    - Grade 11-12: Advanced mathematics/science, college-level vocabulary, analytical reasoning, JEE/NEET prep level
    
    IMPORTANT FOR IMAGE-BASED QUESTIONS:
    - If a question requires looking at a picture (e.g., "look at the picture", "how many birds"), include "imagePrompt" field with detailed description
    - ONLY add imagePrompt if visual context is truly needed
    - If you cannot provide good image prompt, rephrase question to not require image
    - Example imagePrompt: "A colorful illustration showing 5 red birds sitting on a tree branch against blue sky"
    
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
          "answer": "correct answer",
          "imagePrompt": "optional: detailed description for image generation (only if question needs visual)"
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

    console.log('Calling Google Gemini API with language:', language);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
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
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests. Please wait a moment and try again.' 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    console.log('Gemini response received, processing images...');
    
    let lessonData;
    try {
      lessonData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Gemini response:', content);
      throw new Error('Invalid response format');
    }

    // Generate images for steps that need them
    if (lessonData.steps && Array.isArray(lessonData.steps)) {
      for (let i = 0; i < lessonData.steps.length; i++) {
        const step = lessonData.steps[i];
        if (step.imagePrompt && step.imagePrompt.trim()) {
          try {
            console.log(`Generating image for step ${i + 1}: ${step.imagePrompt}`);
            
            const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GOOGLE_GEMINI_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                instances: [{
                  prompt: `Educational illustration for ${grade} students: ${step.imagePrompt}. Make it colorful, clear, and age-appropriate.`
                }],
                parameters: {
                  sampleCount: 1
                }
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              const imageBase64 = imageData.predictions?.[0]?.bytesBase64Encoded;
              
              if (imageBase64) {
                lessonData.steps[i].imageUrl = `data:image/png;base64,${imageBase64}`;
                console.log(`Image generated successfully for step ${i + 1}`);
              }
            } else {
              console.error(`Failed to generate image for step ${i + 1}:`, await imageResponse.text());
            }
          } catch (imageError) {
            console.error(`Error generating image for step ${i + 1}:`, imageError);
            // Continue without image if generation fails
          }
        }
      }
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
