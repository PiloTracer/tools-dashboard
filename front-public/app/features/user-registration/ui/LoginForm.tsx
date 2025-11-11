import { Form } from "@remix-run/react";
import type { FC } from "react";

type Props = {
  csrfToken: string;
  defaultEmail?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export const LoginForm: FC<Props> = ({
  csrfToken,
  defaultEmail,
  fieldErrors,
  formError,
  isSubmitting = false,
  disabled = false,
}) => (
  <Form method="post" className="space-y-6" aria-labelledby="login-form-heading">
    {formError ? (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
    ) : null}

    <div className="space-y-2">
      <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
        Email address
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={defaultEmail}
        required
        disabled={disabled}
        aria-invalid={Boolean(fieldErrors?.email) || undefined}
        aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {fieldErrors?.email ? (
        <p id="login-email-error" className="text-sm text-red-600">
          {fieldErrors.email}
        </p>
      ) : null}
    </div>

    <div className="space-y-2">
      <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
        Password
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={disabled}
        aria-invalid={Boolean(fieldErrors?.password) || undefined}
        aria-describedby={fieldErrors?.password ? "login-password-error" : undefined}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {fieldErrors?.password ? (
        <p id="login-password-error" className="text-sm text-red-600">
          {fieldErrors.password}
        </p>
      ) : null}
    </div>

    <input type="hidden" name="csrfToken" value={csrfToken} />
    <input type="hidden" name="intent" value="login" />

    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {isSubmitting ? "Signing you in..." : "Sign in"}
    </button>
  </Form>
);

