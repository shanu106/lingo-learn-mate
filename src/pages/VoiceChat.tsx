import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Volume2, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VoiceChat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [userProfile, setUserProfile] = useState<{ preferred_language?: string; grade?: string } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [canSpeak, setCanSpeak] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setUserProfile({
        preferred_language: data.preferred_language,
        grade: data.grade
      });
    }
  };

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setCanSpeak(false);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = userProfile?.preferred_language || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setCanSpeak(true);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCanSpeak(true);
      };
      
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [userProfile?.preferred_language]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const detectSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkVolume = () => {
      if (!analyserRef.current || !isListening) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      // Threshold for silence detection (adjust as needed)
      const SILENCE_THRESHOLD = 5;
      const SILENCE_DURATION = 2000; // 2 seconds of silence
      
      if (average < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            stopRecording();
          }, SILENCE_DURATION);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
      
      if (isListening) {
        requestAnimationFrame(checkVolume);
      }
    };
    
    checkVolume();
  }, [isListening]);

  const startRecording = async () => {
    if (!canSpeak) {
      toast({
        title: 'Please wait',
        description: 'The tutor is still speaking. Please wait for the response to finish.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio analysis for VAD
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        cleanup();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      stopSpeech();
      
      // Start silence detection
      detectSilence();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const cleanup = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
      stopSpeech();
    };
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    console.log('Processing audio, blob size:', audioBlob.size);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          console.log('Base64 audio prepared, length:', base64Audio.length);
          
          // Transcribe audio
          console.log('Calling transcribe-audio function...');
          const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
            body: { 
              audio: base64Audio,
              languageCode: userProfile?.preferred_language || 'en-US'
            }
          });

          if (transcribeError) {
            console.error('Transcribe error:', transcribeError);
            throw new Error(`Transcription failed: ${transcribeError.message}`);
          }

          console.log('Transcription response:', transcribeData);
          const userText = transcribeData?.text || '';
          setTranscript(userText);
          
          if (!userText.trim()) {
            toast({
              title: 'No speech detected',
              description: 'Please try speaking clearly and try again.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          // Get AI response
          console.log('Calling chat-tutor function with message:', userText);
          const { data: chatData, error: chatError } = await supabase.functions.invoke('chat-tutor', {
            body: {
              message: userText,
              language: userProfile?.preferred_language || 'en-US',
              studentClass: userProfile?.grade || 'Grade 1'
            }
          });

          if (chatError) {
            console.error('Chat error:', chatError);
            throw new Error(`Chat failed: ${chatError.message}`);
          }

          console.log('Chat response:', chatData);
          const aiReply = chatData?.reply || 'I could not process that. Please try again.';
          setResponse(aiReply);
          
          // Speak the response
          speakText(aiReply);
        } catch (innerError) {
          console.error('Inner error processing audio:', innerError);
          throw innerError;
        }
      };

      reader.onerror = () => {
        console.error('FileReader error');
        throw new Error('Failed to read audio file');
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Processing Error',
        description: `Failed to process your question: ${errorMessage}. Please check your internet connection and try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Voice Tutor
          </h1>
          <div className="w-20" />
        </div>

        {/* Main Card */}
        <Card className="p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Ask Your Doubts</h2>
            <p className="text-sm text-muted-foreground">
              Speak in {userProfile?.preferred_language === 'hi-IN' ? 'Hindi' : 
                       userProfile?.preferred_language === 'mr-IN' ? 'Marathi' :
                       userProfile?.preferred_language === 'bn-IN' ? 'Bengali' :
                       userProfile?.preferred_language === 'te-IN' ? 'Telugu' :
                       userProfile?.preferred_language === 'ta-IN' ? 'Tamil' : 'English'} and get instant answers
            </p>
          </div>

          {/* Voice Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={startRecording}
              disabled={isProcessing || isSpeaking || isListening}
              className={`h-32 w-32 rounded-full shadow-2xl transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
                  : isProcessing || isSpeaking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 animate-spin text-white" />
              ) : isListening ? (
                <Mic className="w-12 h-12 text-white animate-pulse" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </Button>
          </div>

          {/* Status */}
          <div className="text-center">
            {isListening && (
              <p className="text-red-500 font-medium animate-pulse">Listening...</p>
            )}
            {isProcessing && (
              <p className="text-blue-500 font-medium">Processing...</p>
            )}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2 text-purple-500 font-medium">
                <Volume2 className="w-5 h-5 animate-pulse" />
                Speaking...
              </div>
            )}
          </div>

          {/* Transcript and Response */}
          {(transcript || response) && (
            <div className="space-y-4 pt-4 border-t">
              {transcript && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">You asked:</p>
                  <p className="text-blue-800">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-purple-900">Tutor's answer:</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => speakText(response)}
                      disabled={isSpeaking}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-purple-800">{response}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <p className="text-sm text-center">
            <span className="font-semibold">💡 Tip:</span> Tap the microphone and start speaking. It will automatically stop when you finish and the tutor will answer!
          </p>
        </Card>
      </div>
    </div>
  );
};

export default VoiceChat;
