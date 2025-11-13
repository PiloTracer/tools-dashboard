import { Form } from "@remix-run/react";
import type { FC } from "react";
import { useEffect, useState } from "react";

type Props = {
  csrfToken: string;
  defaultEmail?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  authenticatedUser?: { email: string } | null;
};

export const AdminSigninForm: FC<Props> = ({
  csrfToken,
  defaultEmail,
  fieldErrors,
  formError,
  isSubmitting = false,
  disabled = false,
  authenticatedUser = null,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authenticatedUser);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (authenticatedUser?.email) {
      setIsAuthenticated(true);
      setUsername(authenticatedUser.email.split("@")[0]);
    }
  }, [authenticatedUser]);

  // If authenticated, hide form and show username in bottom-left
  if (isAuthenticated && username) {
    return (
      <div className="fixed bottom-5 left-5 z-50 animate-fade-in">
        <div className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2 shadow-lg border border-slate-200">
          <p className="text-sm text-slate-600 font-medium">
            Signed in as <span className="text-indigo-600 font-semibold">{username}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 id="admin-signin-form-heading" className="text-3xl font-bold text-slate-900 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-sm text-slate-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-shake"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{formError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <Form method="post" className="space-y-5" aria-labelledby="admin-signin-form-heading">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="admin-signin-email" className="block text-sm font-semibold text-slate-700">
              Email Address
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
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="admin@example.com"
            />
            {fieldErrors?.email && (
              <p id="admin-signin-email-error" className="text-sm text-red-600 font-medium flex items-center gap-1" role="alert">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="admin-signin-password" className="block text-sm font-semibold text-slate-700">
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
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="••••••••••••"
            />
            {fieldErrors?.password && (
              <p id="admin-signin-password-error" className="text-sm text-red-600 font-medium flex items-center gap-1" role="alert">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="intent" value="admin-signin" />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || disabled}
            aria-busy={isSubmitting}
            className="group relative w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing you in...
              </>
            ) : (
              <>
                Sign In
                <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </Form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Admin access only • Email authentication required
          </p>
        </div>
      </div>

      {/* Add custom animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .animate-slide-up {
            animation: slide-up 0.5s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          .animate-shake {
            animation: shake 0.4s ease-out;
          }
        `
      }} />
    </div>
  );
};
