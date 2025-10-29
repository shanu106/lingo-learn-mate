import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, BookOpen, Languages, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
    value: `Grade ${i + 1}`,
    label: `Class ${i + 1}`,
  }));

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({
          name: profile.full_name,
          grade: profile.grade,
          language: profile.preferred_language,
        });
        setHasProfile(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.grade || !formData.language) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name,
          grade: formData.grade,
          preferred_language: formData.language,
        });

      if (error) throw error;

      toast.success(`${hasProfile ? 'Profile updated!' : `Welcome ${formData.name}! Let's start learning.`}`);
      
      if (!hasProfile) {
        navigate("/dashboard");
      } else {
        setIsEditing(false);
        setHasProfile(true);
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || "Failed to save profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (hasProfile && !isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lg-custom">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Name
              </Label>
              <div className="h-12 flex items-center px-3 bg-muted rounded-md">
                <p className="text-base">{formData.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Grade/Class
              </Label>
              <div className="h-12 flex items-center px-3 bg-muted rounded-md">
                <p className="text-base">{formData.grade}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Preferred Language
              </Label>
              <div className="h-12 flex items-center px-3 bg-muted rounded-md">
                <p className="text-base">
                  {languages.find(l => l.value === formData.language)?.label}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setIsEditing(true)} 
                className="flex-1 h-12 text-lg"
                variant="outline"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="flex-1 h-12 text-lg bg-gradient-primary hover:opacity-90"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg-custom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {hasProfile ? "Edit Your Profile" : "Create Your Profile"}
          </h1>
          <p className="text-muted-foreground">
            {hasProfile ? "Update your information" : "Tell us about yourself to personalize your learning"}
          </p>
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

          <div className="flex gap-3">
            {hasProfile && (
              <Button 
                type="button"
                onClick={() => setIsEditing(false)} 
                variant="outline"
                className="flex-1 h-12 text-lg"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1 h-12 text-lg bg-gradient-primary hover:opacity-90">
              {hasProfile ? "Save Changes" : "Start Learning"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetup;
