"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
};

/**
 * Aceternity-style mouse-follow spotlight, written from scratch for Ragora.
 * A low-opacity radial orange glow (0.10) that follows the cursor inside
 * its parent. Use only on the dark hero; subtle, never a neon glow.
 * With prefers-reduced-motion it renders one static centred glow instead.
 */
export function Spotlight({ className }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      return;
    }
    const onMove = (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
        style={{
          left: reducedMotion ? "50%" : position.x,
          top: reducedMotion ? "40%" : position.y,
          opacity: reducedMotion ? 1 : visible ? 1 : 0,
          background:
            "radial-gradient(circle, rgba(232,73,15,0.10) 0%, rgba(232,73,15,0) 70%)",
        }}
      />
    </div>
  );
}
