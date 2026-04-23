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

export const AdminSigninForm: FC<Props> = ({
  csrfToken,
  defaultEmail,
  fieldErrors,
  formError,
  isSubmitting = false,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl shadow-slate-900/40 backdrop-blur-sm sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Admin sign-in
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Tools Dashboard · use your admin email and password
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {formError}
          </div>
        )}

        <Form method="post" className="flex flex-col gap-5">
          <div>
            <label htmlFor="admin-signin-email" className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="admin-signin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={defaultEmail}
              required
              disabled={disabled || isSubmitting}
              aria-invalid={Boolean(fieldErrors?.email) || undefined}
              aria-describedby={fieldErrors?.email ? "admin-signin-email-error" : undefined}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 sm:text-[15px]"
            />
            {fieldErrors?.email && (
              <p id="admin-signin-email-error" role="alert" className="mt-1.5 text-sm text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="admin-signin-password" className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="admin-signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={disabled || isSubmitting}
              aria-invalid={Boolean(fieldErrors?.password) || undefined}
              aria-describedby={fieldErrors?.password ? "admin-signin-password-error" : undefined}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 sm:text-[15px]"
            />
            {fieldErrors?.password && (
              <p id="admin-signin-password-error" role="alert" className="mt-1.5 text-sm text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="intent" value="admin-signin" />

          <button
            type="submit"
            disabled={isSubmitting || disabled}
            aria-busy={isSubmitting}
            className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-[15px] font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </Form>
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        Session expires after 30 minutes of inactivity.
      </p>
    </div>
  );
};
