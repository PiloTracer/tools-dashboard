import { useTranslation } from "react-i18next";

import type { ReachabilityState } from "../hooks/useAppReachability";

type Props = {
  state: ReachabilityState;
  titleUrl?: string;
};

const DOT_STYLES: Record<ReachabilityState, string> = {
  checking: "bg-slate-300 animate-pulse",
  online: "bg-emerald-500",
  offline: "bg-rose-500",
  unavailable: "bg-slate-200",
};

const TEXT_STYLES: Record<ReachabilityState, string> = {
  checking: "text-slate-500",
  online: "text-emerald-800",
  offline: "text-rose-800",
  unavailable: "text-slate-400",
};

export function ReachabilityBadge({ state, titleUrl }: Props) {
  const { t } = useTranslation();
  const label = t(`appLibrary.reachability.${state}`);
  const shortLabel = t(`appLibrary.reachability.${state}Label`);

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-1"
      role="status"
      aria-live="polite"
      title={titleUrl ? t("appLibrary.reachability.titleWithUrl", { label, url: titleUrl }) : label}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[state]}`} aria-hidden />
      <span className={`text-xs font-medium ${TEXT_STYLES[state]}`}>{shortLabel}</span>
    </div>
  );
}
