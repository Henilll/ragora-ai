"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ShimmerButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Orange CTA button with a slow white shimmer sweep across it on hover.
 * Solid accent background, no gradient text. The sweep is disabled
 * under prefers-reduced-motion (see globals.css).
 */
export function ShimmerButton({ href, children, className }: ShimmerButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "shimmer-button group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#E8490F] px-6 font-semibold text-white transition-colors hover:bg-[#FF6B2C]",
        className
      )}
    >
      <span aria-hidden className="shimmer-sweep pointer-events-none absolute inset-0" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}
