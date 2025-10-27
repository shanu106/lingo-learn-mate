import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Plus, Users, BarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"lessons" | "students" | "analytics">("lessons");

  const [lessonForm, setLessonForm] = useState({
    title: "",
    subject: "",
    grade: "",
    content: "",
  });

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title || !lessonForm.subject || !lessonForm.grade || !lessonForm.content) {
      toast.error("Please fill in all fields");
      return;
    }
    
    // In production, this would save to backend
    toast.success("Lesson created successfully!");
    setLessonForm({ title: "", subject: "", grade: "", content: "" });
  };

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
                <p className="text-3xl font-bold">245</p>
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
                <p className="text-3xl font-bold">48</p>
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
                <p className="text-3xl font-bold">78%</p>
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
            <p className="text-muted-foreground">Student list and progress tracking will appear here.</p>
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
