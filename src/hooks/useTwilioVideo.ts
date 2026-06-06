// src/hooks/useTwilioVideo.ts
// Twilio Video Hook - Manages video room connection (audio translation is separate)

import { useRef, useState, useEffect, useCallback } from "react";
import Video, {
    Room,
    LocalVideoTrack,
    RemoteVideoTrack,
    RemoteParticipant,
    RemoteTrackPublication,
} from "twilio-video";
import { BASE_URL } from "@/lib/utils";

interface UseTwilioVideoProps {
    roomId: string;
    identity: string;
    onRemoteParticipantConnected?: (participant: RemoteParticipant) => void;
    onRemoteParticipantDisconnected?: (participant: RemoteParticipant) => void;
}

export function useTwilioVideo({
    roomId,
    identity,
    onRemoteParticipantConnected,
    onRemoteParticipantDisconnected,
}: UseTwilioVideoProps) {
    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteVideoTrack | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const roomRef = useRef<Room | null>(null);
    const localTrackRef = useRef<LocalVideoTrack | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 3;

    // Fetch video token from backend with retry
    const fetchToken = useCallback(async (): Promise<string> => {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`📹 Fetching video token (attempt ${attempt}/${MAX_RETRIES})...`);

                const response = await fetch(`${BASE_URL}/api/video-token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identity, roomName: roomId }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch video token`);
                }

                const data = await response.json();

                if (!data.token) {
                    throw new Error("No token received from server");
                }

                console.log("✅ Video token received");
                return data.token;
            } catch (err: any) {
                lastError = err;
                console.error(`❌ Token fetch attempt ${attempt} failed:`, err.message);

                if (attempt < MAX_RETRIES) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        throw lastError || new Error("Failed to fetch video token after retries");
    }, [roomId, identity]);

    // Handle remote participant track subscriptions
    const handleTrackSubscribed = useCallback((track: RemoteVideoTrack | any) => {
        if (track.kind === "video") {
            console.log("📹 Remote video track subscribed:", track.sid);
            setRemoteVideoTrack(track as RemoteVideoTrack);
        }
    }, []);

    const handleTrackUnsubscribed = useCallback((track: RemoteVideoTrack | any) => {
        if (track.kind === "video") {
            console.log("📹 Remote video track unsubscribed:", track.sid);
            setRemoteVideoTrack(null);
        }
    }, []);

    // Handle track published (for when track is published but not yet subscribed)
    const handleTrackPublished = useCallback((publication: RemoteTrackPublication) => {
        console.log("📹 Remote track published:", publication.kind, publication.trackSid);

        // If already subscribed, handle it
        if (publication.isSubscribed && publication.track && publication.kind === "video") {
            handleTrackSubscribed(publication.track);
        }

        // Listen for subscription
        publication.on("subscribed", handleTrackSubscribed);
        publication.on("unsubscribed", handleTrackUnsubscribed);
    }, [handleTrackSubscribed, handleTrackUnsubscribed]);

    // Setup remote participant listeners
    const setupParticipant = useCallback((participant: RemoteParticipant) => {
        console.log("👤 Remote participant connected:", participant.identity, "tracks:", participant.tracks.size);

        // Handle existing track publications
        participant.tracks.forEach((publication: RemoteTrackPublication) => {
            console.log("  📹 Existing track:", publication.kind, "subscribed:", publication.isSubscribed);

            if (publication.kind === "video") {
                // Handle already subscribed tracks
                if (publication.isSubscribed && publication.track) {
                    handleTrackSubscribed(publication.track);
                }

                // Listen for future subscription
                publication.on("subscribed", handleTrackSubscribed);
                publication.on("unsubscribed", handleTrackUnsubscribed);
            }
        });

        // Handle new track publications
        participant.on("trackPublished", handleTrackPublished);
        participant.on("trackSubscribed", handleTrackSubscribed);
        participant.on("trackUnsubscribed", handleTrackUnsubscribed);

        onRemoteParticipantConnected?.(participant);
    }, [handleTrackSubscribed, handleTrackUnsubscribed, handleTrackPublished, onRemoteParticipantConnected]);

    // Connect to Twilio Video room
    const connect = useCallback(async () => {
        // Prevent duplicate connections
        if (roomRef.current || isConnecting) {
            console.log("⚠️ Already connected or connecting to video room");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            console.log("📹 Connecting to Twilio Video room:", roomId);

            // Get token with retry
            const token = await fetchToken();

            // Create local video track with error handling
            let videoTrack: LocalVideoTrack;
            try {
                videoTrack = await Video.createLocalVideoTrack({
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 24 },
                });
                console.log("✅ Local video track created");
            } catch (trackErr: any) {
                console.error("❌ Failed to create local video track:", trackErr);
                throw new Error(`Camera access failed: ${trackErr.message}`);
            }

            localTrackRef.current = videoTrack;
            setLocalVideoTrack(videoTrack);

            // Connect to room
            const room = await Video.connect(token, {
                name: roomId,
                tracks: [videoTrack],
                dominantSpeaker: true,
                networkQuality: { local: 1, remote: 1 },
            });

            roomRef.current = room;
            setIsConnected(true);
            retryCountRef.current = 0;
            console.log("✅ Connected to Twilio Video room:", room.name, "SID:", room.sid);
            console.log("   Participants in room:", room.participants.size);

            // Handle existing participants
            room.participants.forEach(setupParticipant);

            // Handle new participants
            room.on("participantConnected", (participant) => {
                console.log("👤 New participant joined:", participant.identity);
                setupParticipant(participant);
            });

            room.on("participantDisconnected", (participant: RemoteParticipant) => {
                console.log("👤 Remote participant disconnected:", participant.identity);
                setRemoteVideoTrack(null);
                onRemoteParticipantDisconnected?.(participant);
            });

            room.on("disconnected", (room, error) => {
                console.log("📹 Disconnected from video room", error ? `Error: ${error.message}` : "");
                setIsConnected(false);
                setRemoteVideoTrack(null);
                roomRef.current = null;
            });

            // Log reconnection events
            room.on("reconnecting", (error) => {
                console.log("🔄 Reconnecting to video room...", error?.message);
            });

            room.on("reconnected", () => {
                console.log("✅ Reconnected to video room");
            });

        } catch (err: any) {
            console.error("❌ Failed to connect to video room:", err);
            setError(err.message || "Failed to connect to video");
            setIsConnected(false);

            // Clean up any created track on error
            if (localTrackRef.current) {
                localTrackRef.current.stop();
                localTrackRef.current = null;
                setLocalVideoTrack(null);
            }
        } finally {
            setIsConnecting(false);
        }
    }, [roomId, isConnecting, fetchToken, setupParticipant, onRemoteParticipantDisconnected]);

    // Disconnect from video room
    const disconnect = useCallback(() => {
        console.log("📹 Disconnecting from video room");

        // Stop local video track
        if (localTrackRef.current) {
            localTrackRef.current.stop();
            localTrackRef.current = null;
            setLocalVideoTrack(null);
        }

        // Disconnect from room
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(false);
        setRemoteVideoTrack(null);
    }, []);

    // Toggle video on/off
    const toggleVideo = useCallback(async () => {
        if (!roomRef.current) {
            console.warn("📹 Cannot toggle video: Not connected to a room");
            return;
        }

        if (isVideoOn && localTrackRef.current) {
            console.log("📹 Turning off video...");
            const track = localTrackRef.current;
            
            // Unpublish from room so remote participants see us turn off
            roomRef.current.localParticipant.unpublishTrack(track);
            
            // Stop hardware capture (turns off camera light)
            track.stop();
            
            localTrackRef.current = null;
            setLocalVideoTrack(null);
            setIsVideoOn(false);
            console.log("📹 Video disabled and hardware released");
        } else if (!isVideoOn) {
            console.log("📹 Turning on video...");
            try {
                const newTrack = await Video.createLocalVideoTrack({
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 24 },
                });
                
                // Publish to room so remote participants can see us again
                if (roomRef.current) {
                    await roomRef.current.localParticipant.publishTrack(newTrack);
                }
                
                localTrackRef.current = newTrack;
                setLocalVideoTrack(newTrack);
                setIsVideoOn(true);
                console.log("✅ Video enabled and published");
            } catch (err: any) {
                console.error("❌ Failed to turn on video:", err);
                setError(`Camera error: ${err.message}`);
            }
        }
    }, [isVideoOn]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        // State
        isConnected,
        isConnecting,
        isVideoOn,
        localVideoTrack,
        remoteVideoTrack,
        error,

        // Actions
        connect,
        disconnect,
        toggleVideo,
    };
}
