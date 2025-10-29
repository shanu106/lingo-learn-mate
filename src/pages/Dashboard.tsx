import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Mic, Trophy, Settings, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentProfile {
  name: string;
  grade: string;
  language: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress] = useState(35); // Mock progress

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        navigate("/profile-setup");
        return;
      }

      setProfile({
        name: profileData.full_name,
        grade: profileData.grade,
        language: profileData.preferred_language,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
      navigate("/profile-setup");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const subjects = [
    { id: "math", name: "Mathematics", icon: "📐", progress: 45, color: "bg-blue-500" },
    { id: "science", name: "Science", icon: "🔬", progress: 30, color: "bg-green-500" },
    { id: "english", name: "English", icon: "📚", progress: 25, color: "bg-purple-500" },
    { id: "social", name: "Social Studies", icon: "🌍", progress: 40, color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Vidya</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {profile.name}!</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile-setup")}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-3xl font-bold">{progress}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lessons Completed</p>
                <p className="text-3xl font-bold">12</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                <p className="text-3xl font-bold">450</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success-foreground" />
              </div>
            </div>
          </Card>
        </div>

        {/* Subjects */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                className="p-6 cursor-pointer hover:shadow-lg-custom transition-all duration-300 border-2 hover:border-primary/50"
                onClick={() => navigate(`/lesson/${subject.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{subject.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{profile.grade}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-gradient-primary">
                    Continue
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Voice Practice CTA */}
        <Card className="p-8 bg-gradient-hero text-primary-foreground border-0 shadow-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Practice with Voice</h2>
              <p className="opacity-90">
                Try our interactive voice lessons. Speak your answers and get instant feedback!
              </p>
            </div>
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-14 px-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white"
              onClick={() => navigate("/lesson/voice-practice")}
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Voice Practice
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
