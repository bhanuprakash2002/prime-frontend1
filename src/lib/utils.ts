// src/lib/utils.ts
// Utility functions for PrimeTalker

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ---------------------------------------------
// 🔹 UI Utility Function
// ---------------------------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------
// 🔹 BACKEND BASE URL
// Production URL hardcoded for Vercel deployment
// ---------------------------------------------
export const BASE_URL = "https://prime-t1.onrender.com";
console.log("BASE_URL:", BASE_URL);

// ---------------------------------------------
// 🔹 WebSocket URL Helper
// ---------------------------------------------
export function getWebSocketURL(): string {
  const url = new URL(BASE_URL);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${url.host}/audio-stream`;
}

// ---------------------------------------------
// 🔹 API Helpers
// ---------------------------------------------

// Basic GET helper
export async function apiGet(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
  });

  if (!res.ok) {
    console.error(`GET ${endpoint} failed`, await res.text());
    throw new Error(`GET ${endpoint} failed`);
  }
  return res.json();
}

// Basic POST helper
export async function apiPost(endpoint: string, data: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.error(`POST ${endpoint} failed`, await res.text());
    throw new Error(`POST ${endpoint} failed`);
  }
  return res.json();
}

// ---------------------------------------------
// 🔹 ROOM APIs
// ---------------------------------------------

// Create a new room
export function createRoom(language: string) {
  // Get username from sessionStorage (set when creating room) or fallback
  const creatorName = sessionStorage.getItem("meetingUsername") || "User";
  return apiPost("/create-room", { creatorLanguage: language, creatorName });
}

// Join an existing room
export function joinRoom(roomId: string, language: string) {
  // Get username from sessionStorage (set when joining room) or fallback
  const participantName = sessionStorage.getItem("meetingUsername") || "User";
  return apiPost("/join-room", { roomId, participantLanguage: language, participantName });
}

// Get room info
export function getRoomInfo(roomId: string) {
  return apiGet(`/room-info?roomId=${roomId}`);
}

// Leave room
export function leaveRoom(roomId: string, userType: string) {
  return apiPost("/leave-room", { roomId, userType });
}
