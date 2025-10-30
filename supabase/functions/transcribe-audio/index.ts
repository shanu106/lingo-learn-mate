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
    const { audio, languageCode } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Transcribing audio for language:', languageCode);

    // Load Google Cloud credentials (either inline JSON or from URL)
    async function loadGoogleCredentials() {
      const credsUrl = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS_URL');
      const credsInline = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
      if (credsUrl) {
        const res = await fetch(credsUrl);
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Failed to fetch credentials from URL: ${res.status} ${errText}`);
        }
        return await res.json();
      }
      if (credsInline) return JSON.parse(credsInline);
      throw new Error('Missing GOOGLE_CLOUD_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_URL');
    }

    const credentials = await loadGoogleCredentials();

    if (!credentials.private_key || !credentials.client_email) {
      throw new Error('Invalid Google Cloud credentials');
    }

    // Create JWT for Google Cloud authentication
    const toBase64Url = (input: string) =>
      btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const claim = toBase64Url(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));

    // Sign JWT (simplified - in production use proper crypto library)
    const privateKey = credentials.private_key;
    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${claim}`);
    
    // Import the private key
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/[\r\n\s]/g, '');
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      data
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${header}.${claim}.${signatureBase64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();

    // Call Google Cloud Speech-to-Text API
    const config: any = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: languageCode || 'en-US',
      enableAutomaticPunctuation: true,
      model: 'default',
    };

    // Only add alternative language codes for non-Indian languages
    // For Indian languages, we want pure recognition without English fallback
    const indianLanguages = ['hi-IN', 'mr-IN', 'bn-IN', 'te-IN', 'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'or-IN', 'pa-IN', 'ur-IN'];
    if (!indianLanguages.includes(languageCode || '')) {
      config.alternativeLanguageCodes = ['en-US'];
    }

    const speechResponse = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          audio: {
            content: audio,
          },
        }),
      }
    );

    if (!speechResponse.ok) {
      const error = await speechResponse.text();
      console.error('Speech API error:', error);
      throw new Error(`Speech recognition failed: ${error}`);
    }

    const result = await speechResponse.json();
    console.log('Transcription result:', result);

    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';

    return new Response(
      JSON.stringify({ text: transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
