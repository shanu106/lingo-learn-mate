import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, Mic, MicOff, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [lessonData, setLessonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState("en");
  
  const { supported: srSupported, startListening: startRec } = useSpeechRecognition();

  // Fetch user profile and lesson data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get user's preferred language
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserLanguage(profile.preferred_language);
        }

        // Generate lesson using AI
        const response = await supabase.functions.invoke('generate-lesson', {
          body: {
            topic: id || "Mathematics - Algebra",
            language: profile?.preferred_language || "en",
            grade: "Grade 8"
          }
        });

        if (response.error) throw response.error;
        
        setLessonData(response.data);
      } catch (error: any) {
        console.error('Error fetching lesson:', error);
        toast.error('Failed to load lesson');
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading || !lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading lesson...</p>
        </div>
      </div>
    );
  }

  const currentContent = lessonData.steps[currentStep];
  const progress = ((currentStep + 1) / lessonData.steps.length) * 100;

  // Text-to-Speech function with multilingual support
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Language code mapping
      const langMap: Record<string, string> = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'mr': 'mr-IN',
        'bn': 'bn-IN',
        'te': 'te-IN',
        'ta': 'ta-IN',
      };

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langMap[userLanguage] || 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      toast.success("Playing audio");
    } else {
      toast.error("Speech synthesis not supported");
    }
  };

  // Speech Recognition function with multilingual support (cross-browser)
  const startListening = () => {
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'bn': 'bn-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
    };

    if (!srSupported) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const lang = langMap[userLanguage] || 'en-US';

    startRec(
      lang,
      (transcript) => {
        setUserAnswer(transcript);
        checkAnswer(transcript);
        setIsListening(false);
      },
      () => {
        setIsListening(true);
        toast.info("Listening... Speak your answer");
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        // Handle common error types with clearer messages
        const messages: Record<string, string> = {
          'not-allowed': 'Microphone permission denied. Please allow access and try again.',
          'service-not-allowed': 'Speech service not allowed. Check browser settings.',
          'no-speech': 'No speech detected. Please speak clearly and try again.',
          'audio-capture': 'No microphone found or not accessible.',
          'aborted': 'Listening aborted. Tap the mic to try again.',
        };
        toast.error(messages[err] || 'Could not recognize speech. Please try again.');
        setIsListening(false);
      }
    );
  };

  const checkAnswer = async (answer: string) => {
    if (currentContent.type !== "question" || !currentContent.answer) return;

    try {
      const response = await supabase.functions.invoke('check-answer', {
        body: {
          userAnswer: answer,
          correctAnswer: currentContent.answer,
          language: userLanguage
        }
      });

      if (response.error) throw response.error;

      const { isCorrect: correct, feedback } = response.data;
      setIsCorrect(correct);

      if (correct) {
        toast.success("Great job! That's correct! 🎉");
        speakText(feedback);
        setTimeout(() => handleNext(), 2000);
      } else {
        toast.error("Not quite right. Try again!");
        speakText(feedback);
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      toast.error('Failed to check answer');
    }
  };

  const handleNext = () => {
    if (currentStep < lessonData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setUserAnswer("");
      setIsCorrect(null);
    } else {
      toast.success("Lesson completed! 🎊");
      navigate("/dashboard");
    }
  };

  const handleSkip = () => {
    setUserAnswer("");
    setIsCorrect(null);
    handleNext();
  };

  useEffect(() => {
    // Auto-play explanation when step changes
    if (currentContent.type === "explanation") {
      speakText(currentContent.content);
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">{lessonData.title}</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {lessonData.steps.length}
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 shadow-lg-custom border-2">
          {/* Lesson Content */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold flex-1">
                {currentContent.type === "explanation" ? "Learn" : currentContent.question}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => speakText(currentContent.content)}
                className="flex-shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{currentContent.content}</p>
          </div>

          {/* Answer Section (for questions) */}
          {currentContent.type === "question" && (
            <div className="space-y-6">
              {/* Voice Input */}
              <div className="flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={isListening}
                  className={`h-20 w-20 rounded-full ${
                    isListening 
                      ? "bg-destructive hover:bg-destructive animate-pulse" 
                      : "bg-gradient-primary"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  {isListening ? "Listening..." : "Tap to speak your answer"}
                </p>
              </div>

              {/* User Answer Display */}
              {userAnswer && (
                <Card className={`p-4 border-2 ${
                  isCorrect === true 
                    ? "border-success bg-success/5" 
                    : isCorrect === false 
                    ? "border-destructive bg-destructive/5" 
                    : "border-muted"
                }`}>
                  <div className="flex items-center gap-3">
                    {isCorrect === true && <CheckCircle className="w-6 h-6 text-success" />}
                    {isCorrect === false && <XCircle className="w-6 h-6 text-destructive" />}
                    <div>
                      <p className="text-sm text-muted-foreground">Your answer:</p>
                      <p className="font-medium text-lg">{userAnswer}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Correct Answer (if wrong) */}
              {isCorrect === false && (
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">Correct answer:</p>
                  <p className="font-medium text-lg">{currentContent.answer}</p>
                </Card>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {currentContent.type === "question" && (
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-primary"
              disabled={currentContent.type === "question" && !userAnswer}
            >
              {currentStep < lessonData.steps.length - 1 ? "Next" : "Complete Lesson"}
            </Button>
          </div>
        </Card>

        {/* Hint Card */}
        <Card className="mt-4 p-4 bg-accent border-primary/20">
          <p className="text-sm text-center text-muted-foreground">
            💡 Tip: Use the voice feature to practice speaking. It helps with learning!
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Lesson;
