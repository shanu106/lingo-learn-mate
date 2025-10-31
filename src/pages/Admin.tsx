import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Plus, Users, BarChart, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudentData {
  id: string;
  full_name: string;
  grade: string;
  preferred_language: string;
  completedLessons: number;
  totalScore: number;
  progressPercentage: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"lessons" | "students" | "analytics">("lessons");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeLessons, setActiveLessons] = useState(0);
  const [avgCompletion, setAvgCompletion] = useState(0);

  const [lessonForm, setLessonForm] = useState({
    title: "",
    subject: "",
    grade: "",
    content: "",
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to access admin panel");
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error checking admin role:", roleError);
        toast.error("Error checking permissions");
        navigate("/dashboard");
        return;
      }

      if (!roleData) {
        toast.error("Access denied: Admin privileges required");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchAdminData();
    } catch (error) {
      console.error("Error in admin access check:", error);
      toast.error("Error checking access");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Fetch all assessment results
      const { data: assessments, error: assessmentsError } = await supabase
        .from("assessment_results")
        .select("*");

      if (assessmentsError) throw assessmentsError;

      // Fetch all lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*");

      if (lessonsError) throw lessonsError;

      setActiveLessons(lessons?.length || 0);
      setTotalStudents(profiles?.length || 0);

      // Process student data
      const studentData: StudentData[] = profiles?.map(profile => {
        const userAssessments = assessments?.filter(a => a.user_id === profile.id) || [];
        const uniqueTopics = new Set(userAssessments.map(a => a.topic));
        const completedLessons = uniqueTopics.size;
        const totalScore = userAssessments.reduce((sum, a) => sum + a.score, 0);
        const progressPercentage = lessons?.length ? (completedLessons / lessons.length) * 100 : 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          grade: profile.grade,
          preferred_language: profile.preferred_language,
          completedLessons,
          totalScore,
          progressPercentage: Math.round(progressPercentage)
        };
      }) || [];

      setStudents(studentData);

      // Calculate average completion
      const totalProgress = studentData.reduce((sum, s) => sum + s.progressPercentage, 0);
      const avg = studentData.length ? totalProgress / studentData.length : 0;
      setAvgCompletion(Math.round(avg));

    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Error loading admin data");
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title || !lessonForm.subject || !lessonForm.grade || !lessonForm.content) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("lessons")
        .insert({
          title: lessonForm.title,
          subject: lessonForm.subject,
          grade: lessonForm.grade,
          content: { text: lessonForm.content }
        });

      if (error) throw error;

      toast.success("Lesson created successfully!");
      setLessonForm({ title: "", subject: "", grade: "", content: "" });
      await fetchAdminData();
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 animate-pulse mx-auto mb-4" />
          <p className="text-lg">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">Manage content and students</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{totalStudents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Lessons</p>
                <p className="text-3xl font-bold">{activeLessons}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Completion</p>
                <p className="text-3xl font-bold">{avgCompletion}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                <BarChart className="w-6 h-6 text-success-foreground" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "lessons" ? "default" : "outline"}
            onClick={() => setActiveTab("lessons")}
            className={activeTab === "lessons" ? "bg-gradient-primary" : ""}
          >
            Lessons
          </Button>
          <Button
            variant={activeTab === "students" ? "default" : "outline"}
            onClick={() => setActiveTab("students")}
            className={activeTab === "students" ? "bg-gradient-primary" : ""}
          >
            Students
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            className={activeTab === "analytics" ? "bg-gradient-primary" : ""}
          >
            Analytics
          </Button>
        </div>

        {/* Create Lesson Form */}
        {activeTab === "lessons" && (
          <Card className="p-8 shadow-lg-custom">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Create New Lesson</h2>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Lesson Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Algebra"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={lessonForm.subject} onValueChange={(value) => setLessonForm({ ...lessonForm, subject: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="social">Social Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level</Label>
                <Select value={lessonForm.grade} onValueChange={(value) => setLessonForm({ ...lessonForm, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={`${i + 1}`}>
                        Class {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Lesson Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter lesson content, questions, and explanations..."
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  rows={8}
                />
                <p className="text-sm text-muted-foreground">
                  AI will automatically generate quizzes and voice content from this text.
                </p>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary h-12 text-lg">
                Create Lesson
              </Button>
            </form>
          </Card>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Student Management</h2>
            {students.length === 0 ? (
              <p className="text-muted-foreground">No students found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Completed Lessons</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>{student.grade}</TableCell>
                        <TableCell>{student.preferred_language}</TableCell>
                        <TableCell>{student.completedLessons}</TableCell>
                        <TableCell>{student.totalScore} points</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={student.progressPercentage} className="w-24" />
                            <span className="text-sm font-medium">{student.progressPercentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Learning Analytics</h2>
            <p className="text-muted-foreground">Detailed analytics and insights will appear here.</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Admin;
