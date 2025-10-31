import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Mail } from "lucide-react";

export const AdminSignup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create admin account with email verification required
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: {
            full_name: fullName,
            grade: "Admin",
            preferred_language: "en",
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        setEmailSent(true);
        toast.success("Admin account created! Please verify your email to complete registration.");
      }
    } catch (error: any) {
      console.error("Admin signup error:", error);
      toast.error(error.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent to-background p-4">
        <Card className="w-full max-w-md p-8 shadow-lg-custom text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to <strong>{email}</strong>. 
            Please check your inbox and click the link to activate your admin account. Your admin privileges will be granted upon verification.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="w-full"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent to-background p-4">
      <Card className="w-full max-w-md p-8 shadow-lg-custom">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Registration</h1>
            <p className="text-sm text-muted-foreground">Create an admin account</p>
          </div>
        </div>

        <form onSubmit={handleAdminSignup} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive a verification email
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 6 characters
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary h-12"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Admin Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="link"
              onClick={() => navigate("/auth")}
              className="p-0 h-auto text-primary"
            >
              Sign in here
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminSignup;
