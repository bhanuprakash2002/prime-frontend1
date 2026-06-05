// src/hooks/useWebSocket.ts
// WebSocket + WebRTC Audio hook for live translation

import { useRef, useState, useEffect, useCallback } from "react";
import { BASE_URL } from "@/lib/utils";

interface TranscriptItem {
    id: string;
    originalText: string;
    translatedText: string;
    fromUser: string;
    fromLanguage: string;
    toLanguage: string;
    timestamp: number;
}

interface UseWebSocketProps {
    roomId: string;
    userType: "caller" | "receiver";
    myLanguage: string;
    myName: string;
    onPartnerJoined?: (name: string, language: string) => void;
    onPartnerLeft?: () => void;
}

export function useWebSocket({
    roomId,
    userType,
    myLanguage,
    myName,
    onPartnerJoined,
    onPartnerLeft,
}: UseWebSocketProps) {
    // Connection state
    const [status, setStatus] = useState<string>("Disconnected");
    const [isConnected, setIsConnected] = useState(false);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [localLevel, setLocalLevel] = useState(0);
    const [partnerLevel, setPartnerLevel] = useState(0);

    // Transcripts
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
    const [interimText, setInterimText] = useState<string>("");
    const [partnerInterimText, setPartnerInterimText] = useState<string>("");

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const audioChunksRef = useRef<Int16Array[]>([]);
    const sendIntervalRef = useRef<number | null>(null);
    const meterRafRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Audio playback queue
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);
    const isAudioOnRef = useRef(true); // Track mute state for audio processor
    const partnerLevelTimeoutRef = useRef<number | null>(null);

    // Sync isAudioOnRef with isAudioOn state
    useEffect(() => {
        isAudioOnRef.current = isAudioOn;
    }, [isAudioOn]);

    // Get WebSocket URL
    const getWSUrl = useCallback(() => {
        const url = new URL(BASE_URL);
        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProtocol}//${url.host}/audio-stream`;
    }, []);

    // Process audio queue
    const processAudioQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        const base64Audio = audioQueueRef.current.shift()!;

        try {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Prefer AudioContext for gapless, zero-latency playback (prevents first-word cutoffs)
            if (audioContextRef.current && audioContextRef.current.state === "running") {
                try {
                    // Make a copy of the buffer because decodeAudioData detaches the arraybuffer
                    const bufferCopy = bytes.buffer.slice(0);
                    const audioBuffer = await audioContextRef.current.decodeAudioData(bufferCopy);
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContextRef.current.destination);
                    
                    source.onended = () => {
                        isPlayingRef.current = false;
                        processAudioQueue();
                    };
                    
                    source.start(0);
                    console.log("🔊 Playing translated audio via AudioContext");
                    return; // Successfully played using Web Audio API
                } catch (e) {
                    console.warn("AudioContext decode failed, falling back to HTML Audio:", e);
                }
            }

            // Fallback to HTML Audio element
            const audioBlob = new Blob([bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.volume = 1.0;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                isPlayingRef.current = false;
                processAudioQueue();
            };

            audio.onerror = () => {
                isPlayingRef.current = false;
                processAudioQueue();
            };

            await audio.play();
            console.log("🔊 Playing translated audio via HTML Audio");
        } catch (err) {
            console.error("Error playing audio:", err);
            isPlayingRef.current = false;
            processAudioQueue();
        }
    }, []);

    // Handle incoming messages
    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.event) {
                    case "user_joined":
                        console.log("👤 Partner joined:", data.name);
                        onPartnerJoined?.(data.name, data.language);
                        break;

                    case "user_left":
                        console.log("👤 Partner left");
                        onPartnerLeft?.();
                        break;

                    case "transcript_interim":
                        console.log("⏳ INTERIM TEXT RECEIVED:", data.text);
                        if (data.userType === userType) {
                            setInterimText(data.original || data.text);
                        } else {
                            setPartnerInterimText(data.text || "");
                        }
                        break;

                    case "translation":
                        if (data.fromUser === userType) {
                            setInterimText("");
                        } else {
                            setPartnerInterimText("");
                        }
                        const newTranscript: TranscriptItem = {
                            id: `${Date.now()}-${Math.random()}`,
                            originalText: data.originalText,
                            translatedText: data.translatedText,
                            fromUser: data.fromUser,
                            fromLanguage: data.fromLanguage,
                            toLanguage: data.toLanguage,
                            timestamp: Date.now(),
                        };
                        setTranscripts((prev) => [...prev, newTranscript]);
                        break;

                    case "audio_playback":
                        audioQueueRef.current.push(data.audio);
                        processAudioQueue();
                        // Partner is speaking (receiving their TTS audio)
                        setPartnerLevel(50);
                        if (partnerLevelTimeoutRef.current) clearTimeout(partnerLevelTimeoutRef.current);
                        partnerLevelTimeoutRef.current = window.setTimeout(() => setPartnerLevel(0), 2000);
                        break;
                }
            } catch (e) {
                console.error("Error parsing message:", e);
            }
        },
        [onPartnerJoined, onPartnerLeft, processAudioQueue]
    );

    // Start audio capture
    const startAudioCapture = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                    channelCount: 1,
                },
            });

            mediaStreamRef.current = stream;
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);

            // Audio level meter
            const buf = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(buf);
                let sum = 0;
                for (let k = 0; k < buf.length; k++) sum += buf[k];
                const avg = sum / buf.length;
                const lvl = Math.min(100, Math.round((avg / 255) * 100));
                setLocalLevel(lvl);
                meterRafRef.current = requestAnimationFrame(updateMeter);
            };
            meterRafRef.current = requestAnimationFrame(updateMeter);

            // Audio processor - 4096 buffer for lower latency (~85ms instead of ~170ms)
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!isAudioOnRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                audioChunksRef.current.push(int16Data);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // Send audio every 100ms for faster real-time transcription
            sendIntervalRef.current = window.setInterval(() => {
                const ws = wsRef.current;
                if (!ws || ws.readyState !== WebSocket.OPEN) return;

                // Don't send audio when muted - also clear accumulated chunks
                if (!isAudioOnRef.current) {
                    audioChunksRef.current = [];
                    return;
                }

                if (audioChunksRef.current.length === 0) return;

                const totalLength = audioChunksRef.current.reduce(
                    (sum, chunk) => sum + chunk.length,
                    0
                );
                const combined = new Int16Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunksRef.current) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                audioChunksRef.current = [];

                const base64Audio = btoa(
                    new Uint8Array(combined.buffer)
                        .reduce((data, byte) => data + String.fromCharCode(byte), "")
                );

                ws.send(JSON.stringify({ event: "audio", audio: base64Audio }));
            }, 100);

            console.log("🎤 Audio capture started");
        } catch (err) {
            console.error("Error starting audio:", err);
            setStatus("Microphone Error");
        }
    }, [isAudioOn]);

    // Connect WebSocket
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus("Connecting...");

        const wsUrl = getWSUrl();
        console.log("🔗 Connecting to:", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WebSocket connected");
            setStatus("Connected");
            setIsConnected(true);

            // Send connection info
            ws.send(
                JSON.stringify({
                    event: "connected",
                    roomId,
                    userType,
                    myLanguage,
                    myName,
                })
            );

            // Start audio capture
            startAudioCapture();
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
            console.log("❌ WebSocket closed");
            setStatus("Disconnected");
            setIsConnected(false);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setStatus("Connection Error");
        };
    }, [roomId, userType, myLanguage, myName, getWSUrl, handleMessage, startAudioCapture]);

    // Disconnect
    const disconnect = useCallback(() => {
        // Stop audio
        if (sendIntervalRef.current) {
            clearInterval(sendIntervalRef.current);
            sendIntervalRef.current = null;
        }
        if (meterRafRef.current) {
            cancelAnimationFrame(meterRafRef.current);
            meterRafRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
        }
        analyserRef.current = null;

        // Close WebSocket
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ event: "disconnect" }));
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
        setStatus("Disconnected");
        setLocalLevel(0);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        setIsAudioOn((prev) => {
            const newValue = !prev;
            isAudioOnRef.current = newValue; // Update ref immediately

            // Also disable the actual audio track for hardware-level mute
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = newValue;
                });
            }

            // Clear any accumulated chunks when muting
            if (!newValue) {
                audioChunksRef.current = [];
            }

            console.log(`🎤 Mute toggled: ${newValue ? 'UNMUTED' : 'MUTED'}`);
            return newValue;
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        // State
        status,
        isConnected,
        isAudioOn,
        localLevel,
        partnerLevel,
        transcripts,
        interimText,
        partnerInterimText,

        // Actions
        connect,
        disconnect,
        toggleMute,
        setIsAudioOn,
    };
}
