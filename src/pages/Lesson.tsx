import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, Mic, MicOff, CheckCircle, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [userGrade, setUserGrade] = useState("Grade 8");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);

  // Fetch user profile and lesson data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get user's preferred language and grade
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language, grade')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserLanguage(profile.preferred_language);
          setUserGrade(profile.grade);
        }

        // Generate lesson using AI
        const response = await supabase.functions.invoke('generate-lesson', {
          body: {
            topic: id || "Mathematics - Algebra",
            language: profile?.preferred_language || "en",
            grade: profile?.grade || "Grade 8"
          }
        });

        if (response.error) {
          const errorMsg = response.error.message || 'Failed to load lesson';
          toast.error(errorMsg);
          throw response.error;
        }
        
        setLessonData(response.data);
        // Count total questions for final score
        const questions = response.data?.steps?.filter((s: any) => s.type === "question") || [];
        setTotalQuestions(questions.length);
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
      // Stop any ongoing speech first
      window.speechSynthesis.cancel();
      
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
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      toast.success("Playing audio");
    } else {
      toast.error("Speech synthesis not supported");
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.info("Audio stopped");
    }
  };

  // Use Google STT as the main speech recognition function
  const startListening = async () => {
    await startBackendRecording();
  };

  const startBackendRecording = async () => {
    try {
      setIsListening(true);
      console.log('Starting backend audio recording...');
      toast.info("Recording for 5 seconds...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const langMap: Record<string, string> = {
              'en': 'en-US',
              'hi': 'hi-IN',
              'mr': 'mr-IN',
              'bn': 'bn-IN',
              'te': 'te-IN',
              'ta': 'ta-IN',
            };
            const lang = langMap[userLanguage] || 'en-US';
            
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { audio: base64Audio, languageCode: lang }
            });

            if (error) throw error;

            if (data.text) {
              console.log('Backend transcription:', data.text);
              setUserAnswer(data.text);
              checkAnswer(data.text);
              toast.success("Got your answer!");
            } else {
              toast.error('No speech detected. Please try again.');
            }
          } catch (err) {
            console.error('Backend transcription error:', err);
            toast.error('Transcription failed. Please use text input.');
          }
          
          setIsListening(false);
        };

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();

      // Stop recording after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);

    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Microphone access denied. Please use text input.');
      setIsListening(false);
    }
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
        setScore(score + 1);
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

  const saveResult = async () => {
    if (isSavingResult || !lessonData || !userGrade) return;
    
    setIsSavingResult(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if result already exists for this topic to prevent duplicates
      const { data: existing } = await supabase
        .from('assessment_results')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic', id || 'Unknown')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only save if no recent result exists (within last 10 seconds)
      if (existing) {
        console.log('Result already saved, skipping duplicate');
        return;
      }

      // Save assessment result
      const { error } = await supabase
        .from('assessment_results')
        .insert({
          user_id: user.id,
          topic: id || 'Unknown',
          grade: userGrade,
          score,
          total_questions: totalQuestions,
          language: userLanguage
        });

      if (error) {
        console.error('Error saving result:', error);
      } else {
        console.log('Result saved successfully:', { score, totalQuestions });
      }

      // Update or create student_progress record to mark lesson as completed
      const lessonId = `${id}-${userGrade}`;
      
      // Check if progress record exists
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (progressData) {
        // Update existing progress
        await supabase
          .from('student_progress')
          .update({
            completed: true,
            score,
            attempts: 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressData.id);
      } else {
        // Create new progress record
        await supabase
          .from('student_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            score,
            attempts: 1,
            current_step: lessonData.steps.length
          });
      }
      
      console.log('Progress updated successfully');
    } catch (error) {
      console.error('Error saving result:', error);
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < lessonData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setUserAnswer("");
      setIsCorrect(null);
    } else {
      // Save result and show completion
      await saveResult();
      setLessonComplete(true);
    }
  };

  const handleSkip = () => {
    setUserAnswer("");
    setIsCorrect(null);
    handleNext();
  };

  if (lessonComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6 shadow-lg-custom">
          <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Lesson Complete!</h1>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-primary">
              {score} / {totalQuestions}
            </p>
            <p className="text-muted-foreground">
              {score === totalQuestions ? 'Perfect Score! 🎉' : 
               score >= totalQuestions * 0.7 ? 'Great Job! 👏' : 
               'Keep Practicing! 💪'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-primary"
            size="lg"
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

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
                {currentContent.type === "explanation" ? "📚 Learn" : 
                 currentContent.type === "reading" ? "📖 Read & Understand" : 
                 currentContent.question}
              </h2>
              <div className="flex gap-2 flex-shrink-0">
                {isSpeaking ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={stopSpeech}
                    className="animate-pulse"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => speakText(currentContent.content)}
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
              {currentContent.content}
            </div>
            
            {/* Display MCQ options if available */}
            {currentContent.type === "question" && currentContent.options && Array.isArray(currentContent.options) && (
              <div className="mt-6 space-y-3">
                <p className="font-medium text-sm text-muted-foreground">Choose the correct answer:</p>
                {currentContent.options.map((option: string, index: number) => (
                  <Button
                    key={index}
                    variant={userAnswer === option ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto py-4 px-6"
                    onClick={() => {
                      setUserAnswer(option);
                      checkAnswer(option);
                    }}
                    disabled={isCorrect !== null}
                  >
                    <span className="font-semibold mr-3">{String.fromCharCode(65 + index)}.</span>
                    <span>{option}</span>
                  </Button>
                ))}
              </div>
            )}
            
            {/* Display image if available */}
            {currentContent.imageUrl && (
              <div className="mt-6 rounded-lg overflow-hidden border-2 border-muted">
                <img 
                  src={currentContent.imageUrl} 
                  alt="Lesson illustration" 
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* Answer Section (for questions) - Only show if no options */}
          {currentContent.type === "question" && !currentContent.options && (
            <div className="space-y-6">
              {/* Voice Input */}
              <div className="flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={isListening || isSpeaking || isCorrect !== null}
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
                  {isListening ? "Listening..." : isSpeaking ? "Tutor is speaking..." : "Tap to speak your answer"}
                </p>
              </div>

              {/* Text Input Fallback */}
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground text-center">Or type your answer:</p>
                <div className="flex gap-2">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={isSpeaking || isCorrect !== null}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userAnswer.trim()) {
                        checkAnswer(userAnswer);
                      }
                    }}
                  />
                  <Button 
                    onClick={() => checkAnswer(userAnswer)}
                    disabled={!userAnswer.trim() || isSpeaking || isCorrect !== null}
                  >
                    Submit
                  </Button>
                </div>
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
              {currentStep < lessonData.steps.length - 1 ? "Next" : "See Results 🎯"}
            </Button>
          </div>

          {/* Score Display */}
          {totalQuestions > 0 && (
            <Card className="mt-4 p-4 bg-accent">
              <p className="text-sm text-center font-medium">
                Score: {score}/{totalQuestions} correct
              </p>
            </Card>
          )}
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
