// src/components/call/ControlBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Volume2, VolumeX, MessageSquare, Video, VideoOff } from "lucide-react";

export default function ControlBar({
  isAudioOn,
  isSpeakerOn,
  isChatOpen,
  isVideoOn = true,
  onToggleMute,
  onToggleSpeaker,
  onToggleChat,
  onToggleVideo,
  onEndCall,
}: {
  isAudioOn: boolean;
  isSpeakerOn: boolean;
  isChatOpen?: boolean;
  isVideoOn?: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleChat?: () => void;
  onToggleVideo?: () => void;
  onEndCall: () => void;
}) {
  return (
    <>
      <Button variant={isAudioOn ? "default" : "destructive"} onClick={onToggleMute} className="rounded-full px-4 py-3">
        {isAudioOn ? <Mic className="mr-2" /> : <MicOff className="mr-2" />} {isAudioOn ? "Mute" : "Unmute"}
      </Button>

      {onToggleVideo && (
        <Button variant={isVideoOn ? "default" : "destructive"} onClick={onToggleVideo} className="rounded-full px-4 py-3">
          {isVideoOn ? <Video className="mr-2" /> : <VideoOff className="mr-2" />} {isVideoOn ? "Video" : "Video Off"}
        </Button>
      )}

      <Button variant="outline" onClick={onToggleSpeaker} className="rounded-full px-4 py-3">
        {isSpeakerOn ? <Volume2 className="mr-2" /> : <VolumeX className="mr-2" />} {isSpeakerOn ? "Speaker" : "Speaker Off"}
      </Button>

      <Button variant="destructive" onClick={onEndCall} className="rounded-full px-6 py-3">
        <Phone className="mr-2" /> End Call
      </Button>

      <div className="ml-4 flex gap-2">
        <Button
          variant={isChatOpen ? "secondary" : "ghost"}
          onClick={onToggleChat}
          className="rounded-full px-3 py-2"
          title="Toggle Chat"
        >
          <MessageSquare />
        </Button>
      </div>
    </>
  );
}

