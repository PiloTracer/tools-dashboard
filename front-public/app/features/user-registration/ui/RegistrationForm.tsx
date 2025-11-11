import { Form } from "@remix-run/react";
import type { FC } from "react";

type Props = {
  csrfToken: string;
  passwordMinLength: number;
  defaultEmail?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export const RegistrationForm: FC<Props> = ({
  csrfToken,
  passwordMinLength,
  defaultEmail,
  fieldErrors,
  formError,
  isSubmitting = false,
  disabled = false,
}) => (
  <Form method="post" className="space-y-6">
    {formError ? (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
    ) : null}

    <div className="space-y-2">
      <label htmlFor="email" className="block text-sm font-medium text-slate-700">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={defaultEmail}
        required
        disabled={disabled}
        aria-invalid={Boolean(fieldErrors?.email) || undefined}
        aria-describedby={fieldErrors?.email ? "email-error" : undefined}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {fieldErrors?.email ? (
        <p id="email-error" className="text-sm text-red-600">
          {fieldErrors.email}
        </p>
      ) : null}
    </div>

    <div className="space-y-2">
      <label htmlFor="password" className="block text-sm font-medium text-slate-700">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={passwordMinLength}
        maxLength={72}
        required
        disabled={disabled}
        aria-invalid={Boolean(fieldErrors?.password) || undefined}
        aria-describedby={fieldErrors?.password ? "password-error" : "password-hint"}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <div className="text-sm text-slate-500">
        <p id="password-hint">Must be at least {passwordMinLength} characters and no more than 72.</p>
        {fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-red-600">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
    </div>

    <input type="hidden" name="csrfToken" value={csrfToken} />
    <input type="hidden" name="passwordPolicyMinLength" value={passwordMinLength} />

    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-300"
    >
      {isSubmitting ? "Creating your account..." : "Create account"}
    </button>
  </Form>
);
