// Ragora product mark, chosen by henil: Knowledge nodes.
// Three documents connected into one answer. The orange node is the
// source, the other two are connected documents. Flat, no gradient, no glow.
// Not the Henil portfolio "H" mark, and not the earlier bubble mark.
export function RagoraMark({ size = 36, variant = "paper" }: { size?: number; variant?: "paper" | "dark" | "orange" }) {
  const palette =
    variant === "dark"
      ? { bg: "#0C0E11", line: "#F2EFE7", main: "#E8490F", other: "#F2EFE7", stroke: "rgba(255,255,255,0.15)" }
      : variant === "orange"
        ? { bg: "#E8490F", line: "#FFFFFF", main: "#0C0E11", other: "#FFFFFF", stroke: undefined }
        : { bg: "#F2EFE7", line: "#0C0E11", main: "#E8490F", other: "#0C0E11", stroke: undefined };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Ragora" style={{ flexShrink: 0, borderRadius: size / 4 }}>
      <rect width="64" height="64" rx="14" fill={palette.bg} stroke={palette.stroke} />
      <line x1="22" y1="22" x2="43" y2="19" stroke={palette.line} strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="22" x2="33" y2="45" stroke={palette.line} strokeWidth="3" strokeLinecap="round" />
      <line x1="43" y1="19" x2="33" y2="45" stroke={palette.line} strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="22" r="10" fill={palette.main} />
      <circle cx="43" cy="19" r="7" fill={palette.other} />
      <circle cx="33" cy="45" r="7" fill={palette.other} />
    </svg>
  );
}

export function RagoraLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <RagoraMark size={size} />
      <span className="text-base font-semibold tracking-tight text-[#F2EFE7]">Ragora</span>
    </span>
  );
}
