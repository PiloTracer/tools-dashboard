import type { ReachabilityState } from "../hooks/useAppReachability";

type Props = {
  state: ReachabilityState;
  titleUrl?: string;
};

const copy: Record<ReachabilityState, { label: string; dot: string; text: string }> = {
  checking: {
    label: "Checking connection",
    dot: "bg-slate-300 animate-pulse",
    text: "text-slate-500",
  },
  online: {
    label: "App endpoint responded",
    dot: "bg-emerald-500",
    text: "text-emerald-800",
  },
  offline: {
    label: "No response (app may be stopped or blocked)",
    dot: "bg-rose-500",
    text: "text-rose-800",
  },
  unavailable: {
    label: "No URL to check",
    dot: "bg-slate-200",
    text: "text-slate-400",
  },
};

const short: Record<ReachabilityState, string> = {
  checking: "Checking…",
  online: "Available",
  offline: "Offline",
  unavailable: "—",
};

export function ReachabilityBadge({ state, titleUrl }: Props) {
  const c = copy[state];
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-1"
      role="status"
      aria-live="polite"
      title={
        titleUrl
          ? `${c.label} (checked from your browser: ${titleUrl})`
          : c.label
      }
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`}
        aria-hidden
      />
      <span className={`text-xs font-medium ${c.text}`}>{short[state]}</span>
    </div>
  );
}
