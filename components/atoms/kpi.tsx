import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "neutral";

type KpiVariant = "default" | "ok" | "warn" | "danger";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  variant?: KpiVariant;
}

const variantStyles: Record<KpiVariant, { card: string; value: string; icon: string }> = {
  default: { card: "border-border",                value: "text-text-primary",  icon: "text-text-tertiary" },
  ok:      { card: "border-status-ok-bg",           value: "text-status-ok",     icon: "text-status-ok" },
  warn:    { card: "border-status-warn-bg",          value: "text-status-warn",   icon: "text-status-warn" },
  danger:  { card: "border-status-danger-bg",        value: "text-status-danger", icon: "text-status-danger" },
};

export function KpiCard({ label, value, icon, variant = "default" }: KpiCardProps) {
  const s = variantStyles[variant];
  return (
    <div className={cn("rounded-lg border bg-bg-primary px-4 py-3.5", s.card)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</span>
        {icon && <span className={cn("opacity-60", s.icon)}>{icon}</span>}
      </div>
      <div className={cn("mt-2 text-3xl font-medium tracking-tight", s.value)}>{value}</div>
    </div>
  );
}

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
