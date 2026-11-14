"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqAccordionProps = {
  items: [string, string][];
};

/**
 * Animated FAQ accordion. Same questions and answers as the home page;
 * opens and closes with a height animation instead of an instant show/hide.
 * First item open by default.
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-3">
      {items.map(([question, answer], index) => {
        const isOpen = open === index;
        return (
          <div key={question} className="rounded-xl border border-white/10 bg-[#12151A]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 p-5 text-left text-base font-semibold"
            >
              {question}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-6 text-[#B0ABA0]">{answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
