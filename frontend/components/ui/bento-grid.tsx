"use client";

import { cn } from "@/lib/utils";

type BentoGridProps = {
  className?: string;
  children: React.ReactNode;
};

/** Three-column bento grid. Cards span with `lg:col-span-2` on the card. */
export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}

type BentoCardProps = {
  className?: string;
  icon: React.ReactNode;
  title: string;
  text: string;
};

/**
 * Bento card. On hover the border turns orange and the card lifts
 * slightly. Flat ink surface, no gradient, no glow.
 */
export function BentoCard({ className, icon, title, text }: BentoCardProps) {
  return (
    <article
      className={cn(
        "group rounded-xl border border-white/10 bg-[#12151A] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8490F]/60",
        className
      )}
    >
      <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-[#E8490F]/12 text-[#FF6B2C]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#B0ABA0]">{text}</p>
    </article>
  );
}
