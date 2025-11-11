import type { FC } from "react";

type VerificationStatus = "pending" | "verified" | "error";

type Props = {
  status: VerificationStatus;
  message: string;
  supportUrl?: string;
};

const STATUS_STYLES: Record<VerificationStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
};

export const VerificationBanner: FC<Props> = ({ status, message, supportUrl }) => (
  <section
    role="status"
    className={`rounded-lg border px-4 py-3 text-sm ${STATUS_STYLES[status]} flex flex-col gap-2`}
  >
    <span>{message}</span>
    {supportUrl ? (
      <a
        href={supportUrl}
        rel="noreferrer"
        target="_blank"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold underline"
      >
        Contact support
      </a>
    ) : null}
  </section>
);
