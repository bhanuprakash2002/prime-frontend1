// src/pages/Meeting.tsx
// WebSocket-based Meeting Page with Twilio Video

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { joinRoom, BASE_URL } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTwilioVideo } from "@/hooks/useTwilioVideo";
import { useUsername } from "@/hooks/useUsername";

import { Globe, Users } from "lucide-react";

import ParticipantTile from "@/components/call/ParticipantTile";
import ControlBar from "@/components/call/ControlBar";
import RightPanel from "@/components/call/RightPanel";

const ROOMINFO_POLL = 2000;

export default function Meeting() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { username } = useUsername();

  const role = (localStorage.getItem("role") || "caller") as "caller" | "receiver";
  const myLanguage = localStorage.getItem("myLanguage") || "en";
  // Use sessionStorage first (set during room creation/join), then Supabase username, then fallback
  const myName = sessionStorage.getItem("meetingUsername") || username || "You";

  // UI state
  const [status, setStatus] = useState("Click Start to Join");
  const [started, setStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isTranslationOn, setIsTranslationOn] = useState(true);

  // Partner state
  const [partnerName, setPartnerName] = useState("Partner");
  const [partnerLanguage, setPartnerLanguage] = useState<string | null>(null);
  const [partnerJoined, setPartnerJoined] = useState(false);

  // WebSocket hook
  const {
    status: wsStatus,
    isConnected,
    isAudioOn,
    localLevel,
    partnerLevel,
    transcripts,
    interimText,
    connect,
    disconnect,
    toggleMute,
  } = useWebSocket({
    roomId: roomId || "",
    userType: role,
    myLanguage,
    myName,
    onPartnerJoined: (name, language) => {
      setPartnerJoined(true);
      setPartnerName(name || "Partner");
      setPartnerLanguage(language || null);
    },
    onPartnerLeft: () => {
      setPartnerJoined(false);
    },
  });

  // Twilio Video hook (for video only - audio is handled by WebSocket)
  const {
    isConnected: isVideoConnected,
    isVideoOn,
    localVideoTrack,
    remoteVideoTrack,
    error: videoError,
    connect: connectVideo,
    disconnect: disconnectVideo,
    toggleVideo,
  } = useTwilioVideo({
    roomId: roomId || "",
    identity: `${myName}-${role}`,
  });

  // Update status from WebSocket
  useEffect(() => {
    setStatus(wsStatus);
  }, [wsStatus]);

  // Fetch room info
  const fetchRoomInfo = useCallback(async () => {
    try {
      if (!roomId) return;

      const res = await fetch(`${BASE_URL}/room-info?roomId=${roomId}`);

      if (res.status === 404) {
        endCall();
        return;
      }

      const json = await res.json();
      setPartnerJoined(Boolean(json.participantLanguage));

      if (role === "caller" && json.participantName) {
        setPartnerName(json.participantName);
        setPartnerLanguage(json.participantLanguage || null);
      } else if (role === "receiver" && json.creatorName) {
        setPartnerName(json.creatorName);
        setPartnerLanguage(json.creatorLanguage || null);
      }
    } catch (err) {
      console.warn("room-info fetch failed", err);
    }
  }, [roomId, role]);

  // Poll room info
  useEffect(() => {
    if (!started) return;
    fetchRoomInfo();
    const id = window.setInterval(fetchRoomInfo, ROOMINFO_POLL);
    return () => window.clearInterval(id);
  }, [started, fetchRoomInfo]);

  // Join room as receiver
  useEffect(() => {
    if (started && role === "receiver" && roomId) {
      joinRoom(roomId, myLanguage)
        .then(() => console.log("Receiver joined room successfully"))
        .catch((err) => console.error("joinRoom failed:", err));
    }
  }, [started, role, roomId, myLanguage]);

  // Start meeting
  const startMeeting = () => {
    setStarted(true);
    fetchRoomInfo();
    connect(); // Audio/translation WebSocket
    connectVideo(); // Twilio Video
  };

  // End call
  const endCall = async () => {
    try {
      if (roomId) {
        await fetch(`${BASE_URL}/leave-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, userType: role }),
        }).catch(console.warn);
      }

      disconnect(); // Audio WebSocket
      disconnectVideo(); // Twilio Video
    } catch (e) {
      console.warn("endCall error", e);
    } finally {
      setPartnerJoined(false);
      navigate("/rooms");
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn((s) => {
      const next = !s;
      const audios = Array.from(document.querySelectorAll("audio")) as HTMLAudioElement[];
      audios.forEach((a) => {
        try {
          a.volume = next ? 1 : 0;
        } catch { }
      });
      return next;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      disconnectVideo();
    };
  }, [disconnect, disconnectVideo]);

  // Convert transcripts for RightPanel
  const formattedTranscripts = transcripts.map((t) => ({
    originalText: t.originalText,
    translatedText: t.translatedText,
    userType: t.fromUser, // RightPanel expects userType
    sourceLang: t.fromLanguage,
    targetLang: t.toLanguage,
    timestamp: t.timestamp,
  }));

  // Participants with video tracks
  const participantsToRender = [
    {
      id: "you",
      name: myName,
      isLocal: true,
      muted: !isAudioOn,
      level: localLevel,
      language: myLanguage,
      videoTrack: localVideoTrack,
      isVideoOn: isVideoOn,
    },
    ...(partnerJoined
      ? [{
        id: "partner",
        name: partnerName,
        isLocal: false,
        muted: false,
        level: partnerLevel,
        language: partnerLanguage,
        videoTrack: remoteVideoTrack,
        isVideoOn: true, // Remote video is always considered "on" if track exists
      }]
      : []),
  ];

  // Pre-join view
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-xl w-full text-center space-y-6">
          <h1 className="text-3xl font-semibold">Join Meeting</h1>
          <p className="text-slate-300">
            Room: {roomId} • {role} • {myLanguage}
          </p>
          <div className="flex justify-center">
            <Button size="lg" onClick={startMeeting}>
              Start Meeting
            </Button>
          </div>
          <p className="text-slate-400 mt-2">{status}</p>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold">PrimeTalker Meeting</div>
            <div className="text-sm text-slate-400">Room: {roomId}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={isConnected ? "bg-green-600" : "bg-slate-800"}>
            {status}
          </Badge>
          <Button variant="ghost" onClick={() => setSidebarOpen((s) => !s)} className="text-slate-200">
            <Users />
          </Button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {participantsToRender.length === 0 ? (
              <div className="text-slate-400">Waiting for participants...</div>
            ) : (
              participantsToRender.map((p) => (
                <ParticipantTile
                  key={p.id}
                  name={p.name}
                  isLocal={p.isLocal}
                  muted={p.muted}
                  level={p.level}
                  language={p.language || undefined}
                  videoTrack={p.videoTrack}
                  isVideoOn={p.isVideoOn}
                />
              ))
            )}
          </div>

          {/* Interim transcript */}
          {interimText && (
            <div className="mt-4 text-center text-slate-400 italic">
              {interimText}...
            </div>
          )}

          {/* Waiting hint */}
          {!partnerJoined && (
            <div className="mt-8 text-center text-slate-400">
              Waiting for partner to join…
            </div>
          )}
        </main>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat Sidebar - Fixed overlay on mobile, inline on desktop */}
        <aside
          className={`
            fixed md:relative inset-y-0 right-0 z-50
            w-full sm:w-80 md:w-96 
            max-h-screen md:max-h-full
            border-l border-slate-800 bg-slate-900 
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <RightPanel
            transcripts={formattedTranscripts}
            onClose={() => setSidebarOpen(false)}
            isTranslationOn={isTranslationOn}
            toggleTranslation={() => setIsTranslationOn((s) => !s)}
          />
        </aside>
      </div>

      {/* Floating control bar */}
      <div className="fixed left-0 right-0 bottom-6 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-slate-800/80 backdrop-blur rounded-3xl px-6 py-3 flex items-center gap-6 shadow-2xl border border-slate-700">
          <ControlBar
            isAudioOn={isAudioOn}
            isSpeakerOn={isSpeakerOn}
            isChatOpen={sidebarOpen}
            isVideoOn={isVideoOn}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onToggleChat={() => setSidebarOpen((s) => !s)}
            onToggleVideo={toggleVideo}
            onEndCall={endCall}
          />
        </div>
      </div>
    </div>
  );
}
