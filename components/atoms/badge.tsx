import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "info" | "gray" | "purple";

const toneClasses: Record<Tone, string> = {
  ok:     "bg-status-ok-bg text-status-ok",
  warn:   "bg-status-warn-bg text-status-warn",
  danger: "bg-status-danger-bg text-status-danger",
  info:   "bg-status-info-bg text-status-info",
  gray:   "bg-bg-secondary text-text-secondary",
  purple: "bg-[#EDE7F6] text-[#5B3A91]",
};

const dotClasses: Record<Tone, string> = {
  ok:     "bg-status-ok",
  warn:   "bg-status-warn",
  danger: "bg-status-danger",
  info:   "bg-status-info",
  gray:   "bg-text-tertiary",
  purple: "bg-[#5B3A91]",
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  tone = "gray",
  dot = false,
  size = "sm",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
        dot && "gap-1.5",
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      )}
      {children}
    </span>
  );
}
