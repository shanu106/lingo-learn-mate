import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Mic, Trophy, Settings, TrendingUp, Volume2, Award, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentProfile {
  name: string;
  grade: string;
  language: string;
}

interface SubjectProgress {
  id: string;
  name: string;
  icon: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  color: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalLessonsCompleted, setTotalLessonsCompleted] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    checkProfile();
  }, []);

  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  const calculateStreak = async (userId: string) => {
    const { data, error } = await supabase
      .from('assessment_results')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) return 0;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < data.length; i++) {
      const completedDate = new Date(data[i].completed_at);
      completedDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (completedDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  };

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

      // Fetch student progress data
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_id', user.id);

      // Fetch assessment results to calculate points
      const { data: assessmentData } = await supabase
        .from('assessment_results')
        .select('score, total_questions, topic')
        .eq('user_id', user.id);

      // Calculate statistics based on assessment results
      const uniqueTopics = Array.from(new Set((assessmentData || []).map(a => a.topic))).filter(Boolean);
      const completedLessons = uniqueTopics.length;
      const totalScore = (assessmentData || []).reduce((sum, a) => sum + (a.score || 0), 0);
      const points = totalScore * 10; // 10 points per correct answer

      setTotalLessonsCompleted(completedLessons);
      setTotalPoints(points);
      setCurrentLevel(calculateLevel(points));

      // Calculate streak
      const streakDays = await calculateStreak(user.id);
      setStreak(streakDays);

      // Define subjects with their data
      const subjectsList = [
        { id: "math", name: "Mathematics", icon: "📐", color: "bg-blue-500" },
        { id: "science", name: "Science", icon: "🔬", color: "bg-green-500" },
        { id: "english", name: "English", icon: "📚", color: "bg-purple-500" },
        { id: "social", name: "Social Studies", icon: "🌍", color: "bg-orange-500" },
      ];

      // Calculate progress for each subject based on unique completed topics
      const subjectsWithProgress = subjectsList.map(subject => {
        const subjectCompleted = uniqueTopics.filter(t =>
          (t as string).toLowerCase() === subject.id.toLowerCase()
        ).length;

        const total = 10; // Target lessons per subject
        const progress = total > 0 ? Math.round((subjectCompleted / total) * 100) : 0;

        return {
          ...subject,
          progress,
          lessonsCompleted: subjectCompleted,
          totalLessons: total,
        } as SubjectProgress;
      });

      setSubjects(subjectsWithProgress);

      // Calculate overall progress as average of subjects
      const avgProgress = subjectsWithProgress.length
        ? Math.round(subjectsWithProgress.reduce((sum, s) => sum + s.progress, 0) / subjectsWithProgress.length)
        : 0;
      setOverallProgress(avgProgress);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Vidya
              </h1>
              <p className="text-sm text-muted-foreground">Welcome back, {profile.name}! 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-primary/10 rounded-full">
              <Award className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">Level {currentLevel}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile-setup")}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Overall Progress</p>
                <p className="text-3xl font-bold mt-1">{overallProgress}%</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Lessons Completed</p>
                <p className="text-3xl font-bold mt-1">{totalLessonsCompleted}</p>
                <p className="text-xs text-muted-foreground mt-1">Keep learning!</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-secondary flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-secondary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Points Earned</p>
                <p className="text-3xl font-bold mt-1">{totalPoints}</p>
                <p className="text-xs text-muted-foreground mt-1">Level {currentLevel}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-success-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Learning Streak</p>
                <p className="text-3xl font-bold mt-1">{streak}</p>
                <p className="text-xs text-muted-foreground mt-1">days in a row 🔥</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Level {currentLevel}</h3>
                <p className="text-sm text-muted-foreground">
                  {totalPoints % 100} / 100 points to Level {currentLevel + 1}
                </p>
              </div>
            </div>
            <Award className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <Progress value={(totalPoints % 100)} className="h-3" />
        </Card>

        {/* Subjects */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Subjects</h2>
            <p className="text-sm text-muted-foreground">{profile.grade}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                className="p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-card/50"
                onClick={() => navigate(`/lesson/${subject.id}`)}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{subject.icon}</div>
                    <div>
                      <h3 className="font-bold text-xl">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {subject.lessonsCompleted} of {subject.totalLessons} lessons
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-gradient-primary shadow-lg hover:shadow-xl transition-all">
                    Continue
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Progress</span>
                    <span className="font-bold text-primary">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-3" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card 
            className="p-8 bg-gradient-hero text-primary-foreground border-0 shadow-glow cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all"
            onClick={() => navigate('/voice-chat')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm shadow-lg">
                <Volume2 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-1">Voice Tutor</h3>
                <p className="text-sm opacity-90">Ask questions and get instant answers</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-8 bg-gradient-secondary text-secondary-foreground border-0 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all"
            onClick={() => navigate('/results')}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm shadow-lg">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-1">My Results</h3>
                <p className="text-sm opacity-90">View your assessment history</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
