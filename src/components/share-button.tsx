"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  const handleShare = async () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://dotadata.com";
    const fullUrl = url.startsWith("http") ? url : `${base}${url}`;
    const body = `${text}\n${fullUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: body, url: fullUrl });
        return;
      } catch {
        // falls through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(body);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // noop
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        status === "copied" && "border-primary/30 text-primary",
        className,
      )}
    >
      {status === "copied" ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
      {status === "copied" ? "Copied!" : "Share"}
    </button>
  );
}
