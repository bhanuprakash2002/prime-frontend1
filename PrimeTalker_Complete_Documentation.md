# PRIMETALKER — Complete Project Documentation

> **Real-time AI Voice Translation Video Calling Application**
> Two users speak in different languages and hear each other in their own language — instantly.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Requirements](#2-requirements)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Folder Structure](#5-folder-structure)
6. [Page Routes & Navigation](#6-page-routes--navigation)
7. [User Journeys](#7-user-journeys)
8. [End-to-End Voice Translation Pipeline](#8-end-to-end-voice-translation-pipeline)
9. [Video Calling Flow (Twilio)](#9-video-calling-flow-twilio)
10. [Authentication Flow (Supabase)](#10-authentication-flow-supabase)
11. [REST API Endpoints](#11-rest-api-endpoints)
12. [WebSocket Events](#12-websocket-events)
13. [Google Cloud AI Pipeline Detail](#13-google-cloud-ai-pipeline-detail)
14. [Performance Optimizations](#14-performance-optimizations)
15. [Supported Languages](#15-supported-languages)
16. [Environment Variables](#16-environment-variables)
17. [How to Run](#17-how-to-run)
18. [Deployment](#18-deployment)

---

## 1. PROJECT OVERVIEW

**PrimeTalker** is a real-time voice translation video calling application. It allows two users who speak different languages to have a live video call where:

- User A speaks in their language (e.g., English)
- The app captures audio → converts speech to text → translates → converts back to speech
- User B hears the translation in their own language (e.g., Telugu) — automatically

The entire pipeline runs in real-time with minimal latency (2–3 seconds end-to-end).

### What Makes It Special

| Feature | Description |
|---|---|
| **Live Video Call** | WebRTC-based 1-on-1 video call via Twilio |
| **Real-time Translation** | Speak → Hear translation in partner's language |
| **Live Transcription** | See what's being said on screen as it's spoken |
| **40+ Languages** | Indian, European, Asian, and Middle Eastern languages |
| **Neural2 Voices** | Google's highest quality AI voices for natural speech |
| **No Overlap** | Audio queue ensures translations play one at a time |
| **Guest Access** | No account needed — join via a shared link |

---

## 2. REQUIREMENTS

### 2.1 Functional Requirements

#### Authentication & User Management
- Users must be able to **register** and **login** via email/password (Supabase Auth)
- Authenticated sessions must persist using `localStorage`
- The Dashboard (`/rooms`) page must be **protected** — unauthenticated users redirect to `/auth`

#### Room Management
- Authenticated users (Creators) must be able to **create unique meeting rooms**
- Each room gets a unique `roomId` and a shareable invite link
- **Guests** must be able to join a room using the invite link without creating an account
- Guests must enter their **name** and select their **spoken language** before joining

#### Video Calling
- Two participants must see and hear each other via **live video/audio** (WebRTC)
- Users must be able to **toggle camera on/off** and **mute/unmute microphone**
- Mute must stop audio capture at the **hardware level** (zero data sent to server)

#### Real-Time Voice Translation
- The system must **capture microphone audio** in chunks (every 200ms)
- Audio must be **streamed to the backend** via WebSocket in real-time
- Backend must perform **Speech-to-Text (STT)** and show live transcript to the user
- When the speaker finishes a sentence (silence detected), the system must:
  1. **Translate** the finalized sentence to the partner's language
  2. **Convert to speech (TTS)** using a Neural2 AI voice
  3. **Play the audio** to the partner automatically
- Both users must see the **original text + translated text** on screen

#### Live Transcription
- Users must see a **real-time transcript panel** showing:
  - Interim (live typing preview as words are spoken)
  - Final (completed sentences with translations)

### 2.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Latency** | Under 2–3 seconds from speech → partner hears translation |
| **STT Stream Limit** | Auto-restart at 50s (Google's 60s limit) without losing data |
| **Cold Start** | Eliminated via pre-warming of Google Cloud connections |
| **Audio Overlap** | Prevented via client-side audio playback queue |
| **Responsive UI** | Works on desktop, tablet, and mobile |
| **Concurrent Rooms** | Backend handles multiple rooms simultaneously |
| **Premium Design** | Dark mode, gradients, animations (shadcn/ui + Tailwind) |

### 2.3 External Service Requirements

| Service | Purpose | Required Credentials |
|---|---|---|
| **Supabase** | User auth + PostgreSQL database | Project URL + Anon Key |
| **Twilio** | Video calling (WebRTC SFU) | Account SID + API Key + API Secret |
| **Google Cloud** | Speech-to-Text, Translate, Text-to-Speech | Service Account JSON credentials |

---

## 3. TECH STACK

### Frontend (`p1/`)

| Layer | Technology | Version |
|---|---|---|
| Framework | React + TypeScript | 18.3 |
| Build Tool | Vite | 5.4 |
| Routing | React Router | v6 |
| State Management | TanStack React Query + hooks | 5.x |
| UI Components | shadcn/ui (Radix UI primitives) | — |
| Styling | Tailwind CSS | v3.4 |
| Forms & Validation | React Hook Form + Zod | — |
| Video SDK | Twilio Video JS SDK | v2.33 |
| Auth Client | Supabase JS | v2.86 |
| Icons | Lucide React | — |
| Deployment | Vercel | — |

### Backend (`twil/`)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | — |
| HTTP Server | Express.js | v4.18 |
| WebSocket | ws | v8.14 |
| Speech-to-Text | @google-cloud/speech | v6.0 |
| Translation | @google-cloud/translate | v8.0 |
| Text-to-Speech | @google-cloud/text-to-speech | v5.0 |
| Video Tokens | Twilio Node SDK | v5.0 |
| Database Driver | pg (PostgreSQL) | v8.16 |
| Deployment | AWS EC2 / Render | — |

---

## 4. SYSTEM ARCHITECTURE

```
                    +-------------------------------+
                    |          BROWSER              |
                    |   React + Vite + TypeScript   |
                    |     Deployed on Vercel        |
                    +---+----------+----------+-----+
                        |          |          |
                   HTTPS REST   WebSocket  HTTPS Auth
                  (REST API)  (/audio-     (Supabase)
                               stream)
                        |          |          |
                        v          v          v
                 +-------+  +----------+  +----------+
                 |Express|  | ws Server|  | Supabase |
                 | REST  |  |  voice-  |  | Auth+DB  |
                 |server |  |processor |  |(PostgreSQL)|
                 +---+---+  +----+-----+  +----------+
                     |           |
                     |      gRPC streaming
                     |           |
                     |           v
                     |    +------+------+
                     |    | Google STT  |
                     |    +------+------+
                     |           | transcript
                     |           v
                     |    +------+------+
                     |    | Google      |
                     |    | Translate   |
                     |    +------+------+
                     |           | translated text
                     |           v
                     |    +------+------+
                     |    | Google TTS  |
                     |    | (Neural2)   |
                     |    +------+------+
                     |           |
                     |    WAV audio -> WebSocket -> Partner Browser
                     |
                POST /api/video-token
                     |
                     v
               +-----------+
               | Twilio JWT|
               +-----------+
                     |
              Browser Twilio.connect(token)
                     |
                     v
              +-----------+
              |  Twilio   |
              | Video SFU | <- WebRTC media relay (video + audio call)
              +-----------+
```

### Three Communication Channels

| Channel | What It Does | Protocol |
|---|---|---|
| **REST API** | Room CRUD, video tokens, health checks | HTTPS (Express) |
| **WebSocket** | Real-time audio streaming + translation delivery | ws:// / wss:// |
| **Twilio WebRTC** | Live video + audio media between participants | WebRTC (SFU) |

---

## 5. FOLDER STRUCTURE

```
p1/                                    <- FRONTEND (React App)
├── index.html                         <- HTML entry point
├── vite.config.ts                     <- Vite build config
├── tailwind.config.ts                 <- Tailwind CSS config
├── package.json                       <- Frontend dependencies
├── vercel.json                        <- Vercel SPA routing
├── .env                               <- Environment variables
└── src/
    ├── main.tsx                        <- React entry point
    ├── App.tsx                         <- Routing + ProtectedRoute wrapper
    ├── index.css                       <- Global styles
    ├── lib/
    │   └── utils.ts                    <- BASE_URL + utility helpers
    ├── integrations/
    │   └── supabase/                   <- Supabase client config + types
    ├── pages/
    │   ├── Landing.tsx                 <- Public marketing / hero page
    │   ├── Auth.tsx                    <- Login + Register (Supabase Auth)
    │   ├── Rooms.tsx                   <- Dashboard: create/join rooms [PROTECTED]
    │   ├── Meeting.tsx                 <- Live call: video + translation
    │   ├── Join.tsx                    <- Guest join via shared link
    │   ├── Index.tsx                   <- Root redirect logic
    │   └── NotFound.tsx                <- 404 page
    ├── components/
    │   ├── call/
    │   │   ├── ControlBar.tsx          <- Mic + camera toggle buttons
    │   │   ├── MicLevel.tsx            <- Mic volume level visualizer
    │   │   ├── ParticipantTile.tsx     <- Video tile per participant
    │   │   └── RightPanel.tsx          <- Live transcript + translation panel
    │   ├── Footer.tsx                  <- App footer
    │   ├── NavLink.tsx                 <- Navigation link component
    │   ├── PremiumBackground.tsx       <- Animated gradient background
    │   └── ui/                         <- shadcn/ui library components
    └── hooks/
        ├── useWebSocket.ts             <- WebSocket + audio capture + playback
        ├── useTwilioVideo.ts           <- Twilio Video room management
        ├── useUsername.ts              <- User identity helper
        ├── use-mobile.tsx              <- Responsive breakpoint detection
        └── use-toast.ts                <- Toast notification system

twil/                                   <- BACKEND (Node.js Server)
├── server.js                           <- Express REST + WebSocket server
├── voice-processor.js                  <- Google Cloud AI pipeline class
├── package.json                        <- Backend dependencies
├── google-credentials.json             <- Google Service Account key
└── .env                                <- Twilio keys, PORT
```

---

## 6. PAGE ROUTES & NAVIGATION

| URL | Page Component | Access Level | Purpose |
|---|---|---|---|
| `/` | `Index.tsx` | Public | Redirect: logged in → `/rooms`, else → `/landing` |
| `/landing` | `Landing.tsx` | Public | Marketing page with "Get Started" CTA |
| `/auth` | `Auth.tsx` | Public | Login / Register form (Supabase) |
| `/rooms` | `Rooms.tsx` | 🔒 PROTECTED | Dashboard — create rooms, copy invite links |
| `/meeting/:roomId` | `Meeting.tsx` | Public | Live call — video + translation |
| `/join/:roomId` | `Join.tsx` | Public | Guest entry — enter name + language |
| `*` | `NotFound.tsx` | Public | 404 page |

### Protected Route Logic

```
User visits /rooms
      |
      v
Check localStorage("prime_user")
      |
      ├── NOT found → Redirect to /auth
      └── FOUND     → Render Rooms page
```

---

## 7. USER JOURNEYS

### 7.1 Creator Journey (Registered User)

```
[1] Open app → /landing
         |
         v
[2] Click "Get Started" → /auth
         |
         v
[3] Login with email/password (Supabase)
         |
         v
[4] Redirected to /rooms (Dashboard)
         |
         v
[5] Click "Create Room"
    → POST /create-room → server returns { roomId, joinUrl }
         |
         v
[6] Auto-navigated to /meeting/:roomId
         |
         v
[7] WebSocket connects to ws://backend/audio-stream
    POST /api/video-token → get Twilio JWT
    Twilio.Video.connect(token)
         |
         v
[8] Copy & share invite link with partner
         |
         v
[9] ✅ LIVE CALL BEGINS — speak and hear translations!
```

### 7.2 Guest Journey (No Account Needed)

```
[1] Receive shared link → /join/:roomId
         |
         v
[2] Enter display name + select spoken language
         |
         v
[3] Click "Join"
    → POST /join-room → server registers participant
         |
         v
[4] Redirected to /meeting/:roomId
         |
         v
[5] WebSocket connects + Twilio Video connects
         |
         v
[6] ✅ LIVE CALL BEGINS — speak and hear translations!
```

---

## 8. END-TO-END VOICE TRANSLATION PIPELINE

This is the **core feature** — how spoken words become translated audio for the partner.

```
USER A (Browser)                    BACKEND (server.js)              GOOGLE CLOUD
================                    ===================              ============

[1] User A speaks
     into microphone
         |
         v
[2] ScriptProcessorNode
    captures 8192 audio
    samples per chunk
         |
         v
[3] Float32 PCM → Int16 PCM
    → encode to base64 string
         |
         | WebSocket (every 200ms)
         | { event:"audio", audio:"<base64>" }
         |
         v
                               [4] Decode base64 → raw
                                   PCM Buffer
                                        |
                                        v
                               [5] Write to gRPC stream ──────────→ Google STT
                                                                        |
                                                           INTERIM result (live)
                                                                ──────→ sent to
                                                                   browser as
                                                                   live preview
                                                                        |
                                                             FINAL result
                                        ←───────────────────────────────┘
                                        |
                               [6] VoiceProcessor
                                   accumulates FINAL
                                   results into a
                                   sentence buffer
                                        |
                               [7] Silence detected!
                                   (1500ms English /
                                    1000ms Indian langs)
                                        |
                                        v
                               [8] Finalized sentence ────────────→ Google Translate
                                                                        |
                                                               Translated text
                                        ←───────────────────────────────┘
                                        |
                                   Send to BOTH users:
                                   { event:"translation",
                                     originalText,
                                     translatedText }
                                        |
                                        v
                               [9] Translated text ───────────────→ Google TTS
                                                                   (Neural2 voice)
                                                                        |
                                                                   WAV audio bytes
                                        ←───────────────────────────────┘
                                        |
                               [10] Send WAV to PARTNER:
                                    { event:"audio_playback",
                                      audio:"<base64 WAV>" }
                                        |
                                        v
USER B (Browser)
[11] Decode base64 WAV → Blob URL
     → HTML5 Audio.play()
         |
         v
[12] 🔊 USER B HEARS THE
     TRANSLATION IN THEIR
     OWN LANGUAGE!
```

### Simplified Pipeline Summary

```
User A Mic
    ↓  PCM audio chunks (every 200ms via WebSocket)
Backend server.js
    ↓  gRPC streaming
Google Speech-to-Text
    ↓  transcript text
VoiceProcessor (sentence accumulation + silence detection)
    ↓  finalized sentence
Google Translate
    ↓  translated text
Google Text-to-Speech (Neural2 voice)
    ↓  WAV audio (via WebSocket)
User B Browser → plays audio → User B HEARS translation!
```

---

## 9. VIDEO CALLING FLOW (Twilio)

```
Browser (useTwilioVideo.ts)
         |
         | POST /api/video-token
         | body: { identity: "username", roomName: "roomId" }
         v
Backend (server.js)
    Creates Twilio AccessToken
    + VideoGrant for the room
         |
         | returns { token: "<JWT>" }
         v
Browser: Twilio.Video.connect(token, { name: roomName })
         |
         v
+---------------------------+
|    Twilio Video Cloud     |
|    TURN / STUN / SFU      |
|    (WebRTC media relay)   |
+---------------------------+
         |
         | RemoteParticipant events arrive
         |   → participantConnected
         |   → trackSubscribed
         v
<ParticipantTile />   renders <video> element for each user
<ControlBar />        camera on/off + mic mute/unmute buttons
```

### How Video + Translation Work Together

- **Twilio** handles the **video/audio media** (what you see and hear directly)
- **WebSocket** handles the **translation pipeline** (separate audio stream for STT/TTS)
- Both run simultaneously — video is peer-to-peer via Twilio, translation is via the backend

---

## 10. AUTHENTICATION FLOW (Supabase)

```
Browser (Auth.tsx)
         |
         | supabase.auth.signUp() — Register
         | supabase.auth.signInWithPassword() — Login
         v
+-----------------------------+
|       Supabase Auth         |
|  (PostgreSQL + JWT tokens)  |
+-----------------------------+
         |
         | returns { user, session }
         v
localStorage.setItem("prime_user", JSON.stringify(user))
         |
         v
App.tsx → ProtectedRoute wrapper
         |
         ├── "prime_user" NOT in localStorage → <Navigate to="/auth" />
         └── "prime_user" FOUND → render the protected page (/rooms)
```

---

## 11. REST API ENDPOINTS

| Method | Endpoint | Request Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ status, activeRooms }` | Server health + room count |
| `POST` | `/create-room` | `{ language, userName }` | `{ roomId, joinUrl }` | Create a new meeting room |
| `POST` | `/join-room` | `{ roomId, name, language }` | `{ creatorLang, creatorName }` | Guest joins existing room |
| `GET` | `/room-info?roomId=X` | — | `{ room details }` | Get room metadata |
| `POST` | `/leave-room` | `{ roomId, userType }` | `{ success }` | Leave or delete room |
| `POST` | `/api/video-token` | `{ identity, roomName }` | `{ token: "<JWT>" }` | Generate Twilio video token |
| `WS` | `/audio-stream` | — | — | WebSocket for real-time audio |

---

## 12. WEBSOCKET EVENTS

### Client → Server

| Event | Payload | When |
|---|---|---|
| `connected` | `{ roomId, userType, myLanguage, myName }` | On WebSocket open |
| `audio` | `{ audio: "<base64 PCM>" }` | Every 200ms while speaking |
| `disconnect` | `{}` | On page leave / close |

### Server → Client

| Event | Payload | When |
|---|---|---|
| `user_joined` | `{ name, language }` | Partner connects |
| `user_left` | `{}` | Partner disconnects |
| `transcript_interim` | `{ text }` | Live speech preview (partial) |
| `translation` | `{ originalText, translatedText, fromUser, fromLanguage, toLanguage }` | Sentence finalized + translated |
| `audio_playback` | `{ audio: "<base64 WAV>", format: "wav" }` | TTS audio for partner to play |

---

## 13. GOOGLE CLOUD AI PIPELINE DETAIL

### 13.1 Speech-to-Text (STT)

| Setting | Value |
|---|---|
| Package | `@google-cloud/speech` |
| Method | `streamingRecognize` (gRPC streaming) |
| Encoding | LINEAR16 (raw PCM) |
| Sample Rate | 48000 Hz |
| Model | `latest_long` (enhanced) |
| Interim Results | `true` (live preview) |
| Stream Limit | 60s max → auto-restart at 50s |

### 13.2 Translation

| Setting | Value |
|---|---|
| Package | `@google-cloud/translate` v2 |
| Method | `translate(text, { from, to })` |
| Input | Finalized sentence + source language code + target language code |
| Output | Translated text string |

### 13.3 Text-to-Speech (TTS)

| Setting | Value |
|---|---|
| Package | `@google-cloud/text-to-speech` |
| Method | `synthesizeSpeech()` |
| Encoding | LINEAR16 |
| Sample Rate | 48000 Hz |
| Speaking Rate | 1.1x (slightly faster for natural feel) |
| Voice Type | **Neural2** (highest quality) |
| Output | PCM bytes → WAV header (44 bytes) prepended → base64 → WebSocket |

---

## 14. PERFORMANCE OPTIMIZATIONS

### 14.1 Singleton Google Clients
- One shared STT, Translate, and TTS client instance for **all** WebSocket connections
- Saves **200–500ms** per new user (no re-authentication overhead)

### 14.2 Pre-Warming (On WebSocket Connect)
- **+500ms** → STT gRPC stream opened in background
- **+600ms** → Translate + TTS called with dummy text
- Eliminates cold-start delay on the first spoken sentence

### 14.3 Adaptive Silence Timeout
- **English / European languages** → 1500ms silence → finalize + translate
- **Indian languages** → 1000ms silence → finalize + translate (faster, due to speech patterns)
- Indian language codes: `te, hi, ta, bn, gu, kn, ml, mr, pa, ur`

### 14.4 STT Stream Auto-Restart
- Google's hard limit: **60 seconds** per streaming session
- Server detects stream age > **50 seconds** → gracefully restarts
- Accumulated sentence buffer **preserved** across restarts (no data loss)

### 14.5 Audio Playback Queue (Client-Side)
- Incoming TTS audio stored in `audioQueueRef[]` array
- Plays **one WAV at a time**, sequentially
- Prevents audio overlap or interruptions

### 14.6 Hardware Mute
- `track.enabled = false` → mic off at **hardware level**
- Accumulated audio chunks cleared on mute
- **Zero data** sent to server when muted

---

## 15. SUPPORTED LANGUAGES

### 40+ Languages Across 4 Regions

| Region | Languages |
|---|---|
| **Indian (10)** | Telugu, Hindi, Tamil, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Urdu |
| **European (19)** | English, Spanish, French, German, Portuguese, Italian, Dutch, Polish, Russian, Swedish, Danish, Norwegian, Finnish, Greek, Czech, Romanian, Hungarian, Ukrainian, Afrikaans |
| **Asian (8)** | Chinese, Japanese, Korean, Vietnamese, Thai, Indonesian, Malay, Filipino |
| **Middle Eastern (4)** | Arabic, Hebrew, Turkish, Persian |

---

## 16. ENVIRONMENT VARIABLES

### Frontend (`p1/.env`)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=http://localhost:5000          # Development
VITE_BACKEND_URL=https://yourserver.com         # Production
```

### Backend (`twil/.env`)

```env
PORT=5000
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_API_KEY_SID=SKxxx...
TWILIO_API_SECRET=xxx...
GOOGLE_CREDENTIALS={ "type":"service_account", ... }   # Full JSON string
```

---

## 17. HOW TO RUN

### Frontend

```bash
cd p1
npm install
npm run dev          # → http://localhost:5173
```

### Backend

```bash
cd twil
npm install
node server.js       # → http://localhost:5000
```

> Both must run simultaneously for the app to work.

---

## 18. DEPLOYMENT

| Component | Platform | Method |
|---|---|---|
| **Frontend** | Vercel | Push to GitHub → Vercel auto-deploys |
| **Backend** | AWS EC2 or Render | Manual deploy (see below) |

### Backend Deployment (EC2)

Detailed steps available in: `.agent/workflows/deploy-ec2.md`

**Summary:**
1. Launch EC2 instance (Ubuntu)
2. Install Node.js
3. Clone repo, `npm install`
4. Set environment variables
5. Run with PM2 process manager
6. Configure Nginx reverse proxy
7. Set up SSL with Let's Encrypt

---

> **End of Documentation** — This covers the complete PrimeTalker project from requirements through architecture, implementation details, and deployment.
