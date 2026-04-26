// src/components/call/MicLevel.tsx
import React from "react";

/**
 * Very small mic-bar showing 5 bars.
 * level: 0-100
 */
export default function MicLevel({ level = 0 }: { level?: number }) {
  const bars = [0, 1, 2, 3, 4];
  return (
    <div className="flex items-end gap-1 h-6 w-16">
      {bars.map((i) => {
        const h = Math.max(3, Math.min(100, Math.round((level - i * 12) * 0.8)));
        const colorClass = h > 60 ? "bg-emerald-400" : h > 30 ? "bg-yellow-400" : "bg-slate-500";
        return (
          <div key={i} className={`w-1 rounded-sm ${colorClass}`} style={{ height: `${h / 2}%`, transition: "height 120ms linear" }} />
        );
      })}
    </div>
  );
}
