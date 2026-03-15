"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const LiveBadge: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
      <div className="flex gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: "0.2s" }} />
        <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>
      <span className="text-xs font-semibold text-success">LIVE</span>
    </div>
  );
};
