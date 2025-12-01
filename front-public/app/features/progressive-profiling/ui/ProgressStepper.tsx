import type { FC } from "react";

type Props = {
  steps: string[];
  current: string;
};

export const ProgressStepper: FC<Props> = ({ steps, current }) => (
  <ol>
    {steps.map((step) => (
      <li key={step} aria-current={step === current ? "step" : undefined}>
        {step}
      </li>
    ))}
  </ol>
);
