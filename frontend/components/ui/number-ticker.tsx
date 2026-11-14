"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

type NumberTickerProps = {
  /** Final value to count up to. */
  value: number;
  /** Decimal places shown, e.g. value 5.67 with decimalPlaces 2. */
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/**
 * Number ticker, written from scratch for Ragora.
 * Counts 0 to `value` when scrolled into view, formatted with commas.
 * API matches the 21st.dev Magic UI original (see APPLY_21ST_LANDING.md):
 * `value` and `decimalPlaces` props. Respects prefers-reduced-motion by
 * rendering the final value immediately, with no animation.
 */
export function NumberTicker({
  value,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
