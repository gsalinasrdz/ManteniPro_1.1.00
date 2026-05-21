import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "neutral";

interface KPIProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  tone?: Tone;
  accent?: string; // CSS color
  className?: string;
}

const subToneClasses: Record<Tone, string> = {
  ok:      "text-status-ok",
  warn:    "text-status-warn",
  danger:  "text-status-danger",
  neutral: "text-text-tertiary",
};

export function KPI({
  label,
  value,
  prefix,
  suffix,
  sub,
  tone = "neutral",
  accent,
  className,
}: KPIProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-bg-primary px-4 py-3.5",
        className
      )}
    >
      {accent && (
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: accent }}
        />
      )}
      <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1 text-3xl font-medium tracking-tight">
        {prefix && <span className="text-md text-text-secondary">{prefix}</span>}
        {value}
        {suffix && (
          <span className="text-base font-normal text-text-secondary">{suffix}</span>
        )}
      </div>
      {sub && (
        <div className={cn("mt-1.5 text-xs", subToneClasses[tone])}>{sub}</div>
      )}
    </div>
  );
}
