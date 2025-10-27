import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, Mic, MicOff, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Mock lesson data - in production, this would come from backend
  const lessonData = {
    title: id === "voice-practice" ? "Voice Practice" : "Mathematics - Algebra Basics",
    steps: [
      {
        type: "explanation",
        content: "Let's learn about algebraic expressions. An algebraic expression combines numbers and variables using operations.",
        question: null,
        answer: null,
      },
      {
        type: "question",
        content: "What is 2x + 3 when x = 5?",
        question: "Calculate the value",
        answer: "13",
      },
      {
        type: "question",
        content: "Solve for x: x + 7 = 12",
        question: "Find the value of x",
        answer: "5",
      },
    ],
  };

  const currentContent = lessonData.steps[currentStep];
  const progress = ((currentStep + 1) / lessonData.steps.length) * 100;

  // Text-to-Speech function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // In production, use profile language
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      toast.success("Playing audio");
    } else {
      toast.error("Speech synthesis not supported");
    }
  };

  // Speech Recognition function
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening... Speak your answer");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer(transcript);
      checkAnswer(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      toast.error("Could not recognize speech. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const checkAnswer = (answer: string) => {
    if (currentContent.type !== "question" || !currentContent.answer) return;

    const isAnswerCorrect = answer.toLowerCase().includes(currentContent.answer.toLowerCase());
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      toast.success("Great job! That's correct! 🎉");
      speakText("Excellent! Your answer is correct.");
      setTimeout(() => handleNext(), 2000);
    } else {
      toast.error("Not quite right. Try again!");
      speakText("That's not correct. Let me explain the answer.");
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
