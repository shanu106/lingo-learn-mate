import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, BookOpen, Languages } from "lucide-react";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    language: "",
  });

  const languages = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिंदी (Hindi)" },
    { value: "mr", label: "मराठी (Marathi)" },
    { value: "bn", label: "বাংলা (Bengali)" },
    { value: "ta", label: "தமிழ் (Tamil)" },
    { value: "te", label: "తెలుగు (Telugu)" },
  ];

  const grades = Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: `Class ${i + 1}`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.grade || !formData.language) {
      toast.error("Please fill in all fields");
      return;
    }

    // Store profile in localStorage for offline access
    localStorage.setItem("studentProfile", JSON.stringify(formData));
    
    toast.success(`Welcome ${formData.name}! Let's start learning.`);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg-custom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Your Profile</h1>
          <p className="text-muted-foreground">Tell us about yourself to personalize your learning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Your Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 text-base"
            />
          </div>

          {/* Grade Selection */}
          <div className="space-y-2">
            <Label htmlFor="grade" className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Grade/Class
            </Label>
            <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select your grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language" className="text-base flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Preferred Language
            </Label>
            <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full h-12 text-lg bg-gradient-primary hover:opacity-90">
            Start Learning
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetup;
