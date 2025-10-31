import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, Mic, BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Mic className="w-8 h-8" />,
      title: "Voice Learning",
      description: "Learn by speaking and listening in your language"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Multiple Languages",
      description: "Support for Hindi, English, and regional languages"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Smart Lessons",
      description: "AI-powered lessons that adapt to your pace"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Track Progress",
      description: "See your improvement and celebrate achievements"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        {/* Hero Section */}
        
        <div className="right-10 absolute top-10">
          <p className="text-lg text-center md:flex justify-center hidden"> Hearing issues?</p>
         
           <Button
            size="lg"
            className="text-lg hidden md:flex h-14 px-8 bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
            
          >
            <a href="http://localhost:5173/">Convert Lectures into ASL Gestures</a>
           
          </Button>
          <Button
            size="lg"
            className="text-sm md:hidden h-10 px-4 -top-5 -right-8 absolute bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
            
          >
            <a href="http://localhost:5173/"> Hearing Disablity ?</a>
           
          </Button>
        </div>
        <div className="text-center space-y-4">
          
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4 shadow-glow">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            विद्या Vidya
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered learning companion for rural education. Learn at your own pace, in your own language, anywhere.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-lg-custom transition-all duration-300 border-2 hover:border-primary/50"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg h-14 px-8 bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg h-14 px-8 border-2"
              onClick={() => navigate("/admin")}
            >
              Admin Login
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Need admin access?{" "}
            <Button
              variant="link"
              onClick={() => navigate("/admin-signup")}
              className="p-0 h-auto text-primary font-semibold"
            >
              Create Admin Account
            </Button>
          </p>
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-muted-foreground">
          Works offline • Free to use • Made for students like you
        </p>
      </div>
    </div>
  );
};

export default Welcome;
