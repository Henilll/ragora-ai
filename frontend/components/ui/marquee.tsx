"use client";

import { cn } from "@/lib/utils";

// Real Ragora capabilities only. Nothing invented.
const items = [
  "Cited answers [S1]",
  "Widget memory",
  "Helpful / Not helpful",
  "Regenerate",
  "Domain allowlist",
  "Rate limits",
  "History export CSV / JSON",
  "20 MB / 200 pages",
];

type MarqueeProps = {
  className?: string;
};

/**
 * CSS marquee. Content is duplicated once; the copy is aria-hidden.
 * Pauses on hover; disabled under prefers-reduced-motion (see globals.css).
 */
export function Marquee({ className }: MarqueeProps) {
  return (
    <div
      className={cn(
        "overflow-hidden border-y border-white/10 bg-[#12151A] py-4",
        className
      )}
    >
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex items-center gap-3 pr-3">
            {items.map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-full border border-white/10 bg-[#0C0E11] px-4 py-2 text-sm text-[#B0ABA0]"
              >
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
