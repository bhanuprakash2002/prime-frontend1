import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, CheckCircle, AlertTriangle, Mail, Edit, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countries, getStatesByCountry } from "@/lib/countryStateData";
import Footer from "@/components/Footer";
import PremiumBackground from "@/components/PremiumBackground";

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

// Password: 6-14 chars, uppercase, lowercase, special char, digit
const validatePassword = (pwd: string): string | null => {
  const errors: string[] = [];

  if (pwd.length < 6 || pwd.length > 14) errors.push("6-14 characters");
  if (!/[A-Z]/.test(pwd)) errors.push("uppercase letter");
  if (!/[a-z]/.test(pwd)) errors.push("lowercase letter");
  if (!/[0-9]/.test(pwd)) errors.push("digit");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push("special character (!@#$%^&*)");

  if (errors.length > 0) {
    return `Password must contain: ${errors.join(", ")}`;
  }
  return null;
};

// Username: 6-14 chars, letters and digits only
const validateUsername = (name: string): string | null => {
  if (name.length < 6 || name.length > 14) return "Username must be 6-14 characters";
  if (!/^[a-zA-Z0-9]+$/.test(name)) return "Username can only contain letters and digits";
  return null;
};

// Email: max 40 chars
const validateEmail = (email: string): string | null => {
  if (email.length > 40) return "Email must be 40 characters or less";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
  return null;
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Multi-step signup: 1 = form, 2 = confirmation, 3 = email sent
  const [signupStep, setSignupStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Get states for selected country
  const availableStates = country ? getStatesByCountry(country) : [];

  // Get display names for confirmation page
  const countryName = countries.find(c => c.code === country)?.name || country;
  const stateName = availableStates.find(s => s.code === stateProvince)?.name || stateProvince;

  // Reset state when country changes
  useEffect(() => {
    setStateProvince("");
  }, [country]);

  // Reset signup step when switching modes
  useEffect(() => {
    setSignupStep(1);
  }, [isSignUp]);

  // =====================================================
  // 🔄 DETECT PASSWORD RECOVERY FROM EMAIL LINK
  // =====================================================
  useEffect(() => {
    // Check URL hash for recovery token (Supabase adds tokens in hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");

    if (type === "recovery") {
      setIsPasswordRecovery(true);
    }

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If there's an active session from recovery link, show password form
      if (session && window.location.hash.includes("type=recovery")) {
        setIsPasswordRecovery(true);
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // 🔐 VALIDATE AND PROCEED TO CONFIRMATION
  // =====================================================
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const usernameError = validateUsername(username);
    if (usernameError) {
      toast({ title: "Invalid Username", description: usernameError, variant: "destructive" });
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      toast({ title: "Invalid Email", description: emailError, variant: "destructive" });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({ title: "Invalid Password", description: passwordError, variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    if (!firstName.trim()) {
      toast({ title: "First Name Required", description: "Please enter your first name.", variant: "destructive" });
      return;
    }

    if (!lastName.trim()) {
      toast({ title: "Last Name Required", description: "Please enter your last name.", variant: "destructive" });
      return;
    }

    if (!country) {
      toast({ title: "Country Required", description: "Please select your country.", variant: "destructive" });
      return;
    }

    if (availableStates.length > 0 && !stateProvince) {
      toast({ title: "State Required", description: "Please select your state/province.", variant: "destructive" });
      return;
    }

    // All validations passed, proceed to confirmation
    setSignupStep(2);
  };

  // =====================================================
  // 🔐 SUBMIT SIGNUP (from confirmation page)
  // =====================================================
  const handleConfirmSignup = async () => {
    setLoading(true);

    try {
      // Create user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/`,
          data: {
            username: username,
            first_name: firstName,
            last_name: lastName,
            country: countryName,
            state: stateName,
          },
        },
      });

      if (error) throw error;

      // Save profile to Supabase PostgreSQL (if user was created)
      if (data.user) {
        try {
          console.log("🔍 Saving profile for user:", data.user.id);
          console.log("📦 Profile data:", { username: username.trim(), firstName, lastName, country: countryName, state: stateName });

          // Insert directly into Supabase user_profiles table
          const { data: insertData, error: profileError } = await supabase
            .from("user_profiles")
            .insert({
              user_id: data.user.id,
              username: username.trim(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              country: countryName,
              state: stateName,
            })
            .select();

          if (profileError) {
            console.error("❌ Profile save error:", profileError);
            console.error("Error details:", JSON.stringify(profileError, null, 2));
          } else {
            console.log("✅ Profile saved successfully:", insertData);
          }
        } catch (profileError) {
          console.error("❌ Profile save error (exception):", profileError);
        }
      } else {
        console.log("⚠️ No user returned from signUp");
      }

      // Move to email confirmation step
      setSignupStep(3);
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔐 SIGN IN HANDLER
  // =====================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Save session to localStorage for Index.tsx
      localStorage.setItem("prime_user", JSON.stringify(data.user));
      // Username is now fetched from Supabase session via useUsername hook

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      navigate("/rooms");
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔑 FORGOT PASSWORD HANDLER
  // =====================================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_SITE_URL}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
      });

      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔒 UPDATE PASSWORD HANDLER (called after reset link)
  // =====================================================
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password Updated!",
        description: "You can now sign in with your new password.",
      });

      setIsPasswordRecovery(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER: EMAIL CONFIRMATION PAGE (Step 3)
  // =====================================================
  const renderEmailConfirmation = () => (
    <Card className="w-full max-w-md shadow-primary">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-green-600">
          Email Sent Successfully!
        </CardTitle>
        <CardDescription className="text-base">
          We've sent a confirmation email to your registered email address.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium">
            Please click the link in the email and follow the instructions to activate your account.
          </p>
        </div>

        {/* Warning about spam */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Important:</span> Please also check your <strong>Spam</strong> or <strong>Junk</strong> mail folder if you don't see the email in your inbox.
          </p>
        </div>

        {/* User Details Summary */}
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Account Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">{firstName} {lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Country:</span>
              <span className="font-medium">{countryName}</span>
            </div>
            {stateName && (
              <div className="flex justify-between">
                <span className="text-gray-500">State/Province:</span>
                <span className="font-medium">{stateName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Password:</span>
              <span className="font-medium">********</span>
            </div>
          </div>
        </div>

        {/* Back to Sign In */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setIsSignUp(false);
            setSignupStep(1);
            // Reset form
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setUsername("");
            setFirstName("");
            setLastName("");
            setCountry("");
            setStateProvince("");
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  );

  // =====================================================
  // RENDER: CONFIRMATION PAGE (Step 2)
  // =====================================================
  const renderConfirmationPage = () => (
    <Card className="w-full max-w-md shadow-primary">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Confirm Your Details</CardTitle>
        <CardDescription>
          Please review your information before creating your account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Details */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">{username}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">First Name:</span>
              <span className="font-medium">{firstName}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">Last Name:</span>
              <span className="font-medium">{lastName}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">Country:</span>
              <span className="font-medium">{countryName}</span>
            </div>
            {stateName && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">State/Province:</span>
                <span className="font-medium">{stateName}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Password:</span>
              <span className="font-medium">********</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full shadow-primary"
            onClick={handleConfirmSignup}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Confirm & Create Account"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSignupStep(1)}
            disabled={loading}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // =====================================================
  // RENDER: SIGNUP FORM (Step 1)
  // =====================================================
  const renderSignupForm = () => (
    <form onSubmit={handleProceedToConfirmation} className="space-y-4">
      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          type="text"
          placeholder="John"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          type="text"
          placeholder="Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="johndoe123"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={6}
          maxLength={14}
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={40}
        />
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger id="country">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State (shown when country has states) */}
      {availableStates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="state">State / Province</Label>
          <Select value={stateProvince} onValueChange={setStateProvince}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={14}
        />
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          maxLength={14}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full shadow-primary"
        disabled={loading}
      >
        Continue
      </Button>
    </form>
  );

  // =====================================================
  // UI
  // =====================================================

  // If on email confirmation step, show that
  if (isSignUp && signupStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col">
        <PremiumBackground />
        <main className="flex-1 flex items-center justify-center p-4">
          {renderEmailConfirmation()}
        </main>
        <Footer />
      </div>
    );
  }

  // If on confirmation step, show that
  if (isSignUp && signupStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col">
        <PremiumBackground />
        <main className="flex-1 flex items-center justify-center p-4">
          {renderConfirmationPage()}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <PremiumBackground />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className={`w-full shadow-primary ${isSignUp ? 'max-w-lg' : 'max-w-md'}`}>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <img
                src="/logo.png"
                alt="PrimeTalker Logo"
                className="w-40 h-auto object-contain cursor-pointer select-none"
              />
            </div>


            <CardTitle className="text-3xl font-bold">
              {isPasswordRecovery
                ? "Set New Password"
                : isForgotPassword
                  ? "Reset Password"
                  : isSignUp
                    ? "Create Account"
                    : "Welcome Back"}
            </CardTitle>

            <CardDescription>
              {isPasswordRecovery
                ? "Enter your new password below"
                : isForgotPassword
                  ? "Enter your email to receive a reset link"
                  : isSignUp
                    ? "Start breaking language barriers today"
                    : "Sign in to continue to your meetings"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isPasswordRecovery ? (
              /* Set New Password Form */
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={14}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full shadow-primary"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            ) : isForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full shadow-primary"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Back to Sign In
                </Button>
              </form>
            ) : isSignUp ? (
              /* Sign Up Form (Step 1) */
              renderSignupForm()
            ) : (
              /* Sign In Form */
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                  >
                    Forgot password?
                  </Button>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full shadow-primary"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Sign In"}
                </Button>
              </form>
            )}

            {/* Switch Auth Mode */}
            {!isForgotPassword && (
              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Auth;
