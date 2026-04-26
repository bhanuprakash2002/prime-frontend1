// src/pages/Join.tsx
// Page for joining a room via shared link

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUsername } from "@/hooks/useUsername";
import { joinRoom } from "@/lib/utils";
import Footer from "@/components/Footer";
import PremiumBackground from "@/components/PremiumBackground";

const Join = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { username, setUsername } = useUsername();

    const [language, setLanguage] = useState("en");
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinRoom = async () => {
        if (!roomId) {
            toast({
                title: "Error",
                description: "Invalid room ID",
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

            const result = await joinRoom(roomId, language);

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

            navigate(`/meeting/${roomId}`);
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

    return (
        <div className="min-h-screen bg-gradient-hero flex flex-col">
            <PremiumBackground />
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-primary border-2">
                    <CardHeader className="text-center space-y-3 sm:space-y-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                            <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl">Join Meeting</CardTitle>
                        <CardDescription className="text-sm">
                            You've been invited to join room <span className="font-mono font-bold text-foreground">{roomId}</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Language Selection */}
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
                            className="w-full"
                            size="lg"
                            onClick={handleJoinRoom}
                            disabled={isJoining}
                        >
                            {isJoining ? "Joining..." : "Join Meeting"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                                Sign up
                            </Button>
                        </p>
                    </CardContent>
                </Card>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Join;
