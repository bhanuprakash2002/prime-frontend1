// src/components/call/RightPanel.tsx
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RightPanel({
  transcripts,
  onClose,
  isTranslationOn,
  toggleTranslation,
}: {
  transcripts: any[];
  onClose: () => void;
  isTranslationOn: boolean;
  toggleTranslation: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive (Instagram-style)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="h-full max-h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="text-lg font-semibold">Live Translation</div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{isTranslationOn ? "On" : "Off"}</Badge>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
        </div>
      </div>

      {/* Messages container - flex-1 with overflow scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {transcripts.length === 0 && (
          <div className="text-slate-400 text-center py-8">
            Start speaking to see translations...
          </div>
        )}

        {transcripts.map((t: any, i: number) => {
          const isYou = t.userType === localStorage.getItem("role");
          return (
            <div
              key={i}
              className={`p-3 rounded-2xl max-w-[85%] ${isYou
                ? "ml-auto bg-gradient-to-r from-sky-600 to-indigo-600 text-white"
                : "mr-auto bg-slate-800/80 text-white"
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium opacity-80">
                  {isYou ? "You" : "Partner"}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-white/30">
                  {t.sourceLang} → {t.targetLang}
                </Badge>
              </div>
              <div className="text-xs opacity-70 italic mb-1">{t.originalText}</div>
              <div className="text-sm font-medium">{t.translatedText}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <Button
          size="sm"
          onClick={toggleTranslation}
          variant={isTranslationOn ? "default" : "outline"}
          className="w-full"
        >
          {isTranslationOn ? "Pause Translation" : "Resume Translation"}
        </Button>
      </div>
    </div>
  );
}
