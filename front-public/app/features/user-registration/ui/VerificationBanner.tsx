import type { FC } from "react";

type Props = {
  status: "pending" | "verified";
};

export const VerificationBanner: FC<Props> = ({ status }) => (
  <section role="status">
    {status === "verified" ? "Your email is verified." : "Check your inbox to verify your email."}
  </section>
);
