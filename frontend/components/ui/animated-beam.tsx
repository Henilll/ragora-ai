"use client";

import { forwardRef, useEffect, useId, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

type AnimatedBeamProps = {
  containerRef: RefObject<HTMLDivElement>;
  fromRef: RefObject<HTMLDivElement>;
  toRef: RefObject<HTMLDivElement>;
  /** Vertical bend of the curve, in px. Positive bends down, negative up. */
  curvature?: number;
  /** Animate the dash flow in the opposite direction. */
  reverse?: boolean;
  /** Seconds per dash-flow cycle. */
  duration?: number;
  className?: string;
};

/**
 * Magic-UI-style animated beam, written from scratch for Ragora.
 * Draws a curved SVG path between two elements inside a container and
 * animates an orange dash along it. Inspired by the 21st.dev original
 * (see APPLY_21ST_LANDING.md); no code was copied from it.
 */
export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3,
  className,
}: AnimatedBeamProps) {
  const gradientId = useId();
  const [pathD, setPathD] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;
      const cr = container.getBoundingClientRect();
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();
      const startX = fr.left - cr.left + fr.width / 2;
      const startY = fr.top - cr.top + fr.height / 2;
      const endX = tr.left - cr.left + tr.width / 2;
      const endY = tr.top - cr.top + tr.height / 2;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 + curvature;
      setPathD(`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
      setSize({ width: cr.width, height: cr.height });
    };
    update();
    const timer = setTimeout(update, 100);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, fromRef, toRef, curvature]);

  if (!pathD) return null;

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute left-0 top-0", className)}
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E8490F" stopOpacity="0" />
          <stop offset="50%" stopColor="#FF6B2C" />
          <stop offset="100%" stopColor="#E8490F" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD} stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <path
        d={pathD}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeDasharray="6 6"
        className="animate-beam"
        style={{
          animationDirection: reverse ? "reverse" : "normal",
          animationDuration: `${duration}s`,
        }}
      />
    </svg>
  );
}

type BeamCircleProps = {
  className?: string;
  children: React.ReactNode;
};

/** Node chip that a beam connects to. Forwards its ref so the beam can measure it. */
export const BeamCircle = forwardRef<HTMLDivElement, BeamCircleProps>(
  function BeamCircle({ className, children }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-[#12151A] px-4 py-2 text-sm font-medium",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
