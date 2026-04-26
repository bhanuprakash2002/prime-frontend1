import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Globe, Video, LogOut, Copy, Check, Share2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUsername } from "@/hooks/useUsername";
import { createRoom, joinRoom } from "@/lib/utils";
import Footer from "@/components/Footer";
import PremiumBackground from "@/components/PremiumBackground";

const Rooms = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { username } = useUsername();

  const [roomId, setRoomId] = useState("");
  const [language, setLanguage] = useState("en");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // New states for sharing
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ==========================================================
  // CREATE ROOM (BACKEND)
  // ==========================================================
  const handleCreateRoom = async () => {
    if (!language) {
      toast({
        title: "Language Required",
        description: "Please select your language before creating a room.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Store username BEFORE calling createRoom so API uses it
      sessionStorage.setItem("meetingUsername", username.trim() || "User");

      const result = await createRoom(language);

      const newRoomId = result.roomId;
      if (!newRoomId) throw new Error("Invalid response from server.");

      // Save meeting info locally (only language and role)
      localStorage.setItem("myLanguage", language);
      localStorage.setItem("role", "caller");

      // Generate share link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/join/${newRoomId}`;

      setCreatedRoomId(newRoomId);
      setShareLink(link);

      toast({
        title: "Room Created!",
        description: "Share the link with others to join.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Share this link with others to join your room.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  // Enter the created room
  const handleEnterRoom = () => {
    if (createdRoomId) {
      navigate(`/meeting/${createdRoomId}`);
    }
  };

  // Reset to create new room
  const handleCreateAnother = () => {
    setCreatedRoomId(null);
    setShareLink(null);
    setCopied(false);
  };

  // ==========================================================
  // JOIN ROOM (BACKEND)
  // ==========================================================
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid room ID",
        variant: "destructive",
      });
      return;
    }

    if (!language) {
      toast({
        title: "Language Required",
        description: "Please select your language before joining.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Store username BEFORE calling joinRoom so API uses it
      sessionStorage.setItem("meetingUsername", username.trim() || "User");

      const result = await joinRoom(roomId.trim(), language);

      if (!result.success) {
        throw new Error(result.message || "Failed to join room");
      }

      // Save meeting info locally (only language and role)
      localStorage.setItem("myLanguage", language);
      localStorage.setItem("role", "receiver");

      toast({
        title: "Joined Room!",
        description: `Connected to room ${roomId}`,
      });

      navigate(`/meeting/${roomId.trim()}`);
    } catch (err: any) {
      toast({
        title: "Error Joining Room",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("prime_user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <PremiumBackground />
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/landing")}>
            <img src="/logo.png" className="w-28 sm:w-40 h-auto" alt="Logo" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sm">
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-12 flex items-center justify-center">
        <div className={`w-full grid ${createdRoomId ? 'max-w-md grid-cols-1' : 'max-w-4xl grid-cols-1 md:grid-cols-2'} gap-4 sm:gap-6`}>

          {/* Create Room / Enter Room */}
          <Card className="shadow-primary border-2 hover:border-primary/50 transition-all">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                <Video className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {createdRoomId ? "Enter Room" : "Create Room"}
              </CardTitle>
              <CardDescription>
                {createdRoomId
                  ? "Share this link with others to join your meeting"
                  : "Start a new meeting room that supports real-time translation"
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!createdRoomId ? (
                <>
                  <div className="space-y-2">
                    <Label>Your Language</Label>
                    <select
                      className="w-full bg-background border p-2 rounded-md"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="te">Telugu</option>
                      <option value="ta">Tamil</option>
                      <option value="bn">Bengali</option>
                      <option value="mr">Marathi</option>
                      <option value="gu">Gujarati</option>
                      <option value="kn">Kannada</option>
                      <option value="ml">Malayalam</option>
                      <option value="pa">Punjabi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="pt">Portuguese</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                      <option value="ko">Korean</option>
                      <option value="ar">Arabic</option>
                      <option value="ru">Russian</option>
                    </select>
                  </div>

                  <Button
                    className="w-full shadow-primary"
                    size="lg"
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating..." : "Create New Room"}
                  </Button>
                </>
              ) : (
                <>
                  {/* Room Created - Show Share Link */}
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Room Created!</span>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Room ID</div>
                      <div className="text-2xl font-mono font-bold">{createdRoomId}</div>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareLink || ""}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                        className="shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleEnterRoom}
                    >
                      Enter Room
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <Button
                    variant="link"
                    className="w-full text-muted-foreground"
                    onClick={handleCreateAnother}
                  >
                    Create Another Room
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Join Room - Only show when no room has been created */}
          {!createdRoomId && (
            <Card className="shadow-primary border-2 hover:border-primary/50 transition-all">
              <CardHeader className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Globe className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Join Room</CardTitle>
                <CardDescription>
                  Enter a room ID & your language to join an existing meeting
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomId">Room ID</Label>
                    <Input
                      id="roomId"
                      type="text"
                      placeholder="ROOM1234"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="text-center text-lg font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Your Language</Label>
                    <select
                      className="w-full bg-background border p-2 rounded-md"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="te">Telugu</option>
                      <option value="ta">Tamil</option>
                      <option value="bn">Bengali</option>
                      <option value="mr">Marathi</option>
                      <option value="gu">Gujarati</option>
                      <option value="kn">Kannada</option>
                      <option value="ml">Malayalam</option>
                      <option value="pa">Punjabi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="pt">Portuguese</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                      <option value="ko">Korean</option>
                      <option value="ar">Arabic</option>
                      <option value="ru">Russian</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    disabled={isJoining}
                  >
                    {isJoining ? "Joining..." : "Join Room"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Rooms;
