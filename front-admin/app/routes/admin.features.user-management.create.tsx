import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { getAdminSession } from "../utils/admin-session.server";
import { bearerHeaders } from "../utils/admin-api-auth.server";

type ActionData = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 sm:p-6";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "block text-sm font-medium text-slate-700";

/**
 * Loader: Render the create-user form (no data needed)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await getAdminSession(request);
  return json({});
}

/**
 * Action: Handle create-user form submission
 */
export async function action({ request }: ActionFunctionArgs) {
  const { accessToken } = await getAdminSession(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "create-user") {
    return json<ActionData>(
      { error: "Invalid form submission" },
      { status: 400 }
    );
  }

  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";
  const role = formData.get("role")?.toString() || "customer";
  const provider = formData.get("provider")?.toString().trim() || "";
  const providerAccountId = formData.get("provider_account_id")?.toString().trim() || "";

  // Validation
  const fieldErrors: Record<string, string> = {};

  if (!email || !email.includes("@")) {
    fieldErrors.email = "A valid email address is required.";
  }

  if (!provider && !password) {
    fieldErrors.password = "Password is required for email accounts.";
  }

  if (password && password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  if (provider && !providerAccountId) {
    fieldErrors.provider_account_id = "Provider account ID is required when a provider is selected.";
  }

  if (providerAccountId && !provider) {
    fieldErrors.provider = "Provider is required when an account ID is given.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Build payload
  const payload: Record<string, unknown> = {
    email,
    role,
    permissions: [],
  };
  if (password) payload.password = password;
  if (provider) payload.provider = provider;
  if (providerAccountId) payload.provider_account_id = providerAccountId;

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    const response = await fetch(`${apiUrl}/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeaders(accessToken),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return json<ActionData>(
        { error: errorData.detail || "Failed to create user." },
        { status: response.status }
      );
    }

    // Redirect to the user list on success
    return redirect("/admin/features/user-management");
  } catch (error) {
    console.error("Error creating user:", error);
    return json<ActionData>(
      { error: "Failed to connect to the API. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Component: Create-user page
 */
export default function CreateUserPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [accountType, setAccountType] = useState<"email" | "oauth">("email");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 pb-12 pt-2 sm:px-4 lg:px-0">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/admin/features/user-management"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          User management
        </Link>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create user</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Create a new user account. The user will receive a verified account and can sign in immediately.
        </p>
      </div>

      {/* Error banner */}
      {actionData?.error ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 shadow-sm ring-1 ring-red-900/10"
          role="alert"
        >
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-red-800">{actionData.error}</p>
        </div>
      ) : null}

      <form method="post" className="space-y-6">
        <input type="hidden" name="intent" value="create-user" />

        {/* Account type */}
        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">Account type</h3>
          <p className="mb-5 text-sm text-slate-600">
            Choose how this user will sign in.
          </p>

          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="account_type"
                value="email"
                checked={accountType === "email"}
                onChange={() => setAccountType("email")}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Email + password
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="account_type"
                value="oauth"
                checked={accountType === "oauth"}
                onChange={() => setAccountType("oauth")}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              OAuth (Google, etc.)
            </label>
          </div>
        </div>

        {/* Email */}
        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">Contact</h3>
          <p className="mb-5 text-sm text-slate-600">
            Primary email used for sign-in and notifications.
          </p>

          <div className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email address <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className={`${inputClass} ${actionData?.fieldErrors?.email ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                placeholder="user@example.com"
              />
              {actionData?.fieldErrors?.email ? (
                <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.email}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Password (email accounts) */}
        {accountType === "email" && (
          <div className={cardClass}>
            <h3 className="mb-1 text-base font-semibold text-slate-900">Password</h3>
            <p className="mb-5 text-sm text-slate-600">
              The user will sign in with this password. Must be at least 8 characters.
            </p>

            <div className="space-y-5">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  className={`${inputClass} ${actionData?.fieldErrors?.password ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  placeholder="Min. 8 characters"
                />
                {actionData?.fieldErrors?.password ? (
                  <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.password}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* OAuth provider fields */}
        {accountType === "oauth" && (
          <div className={cardClass}>
            <h3 className="mb-1 text-base font-semibold text-slate-900">OAuth provider</h3>
            <p className="mb-5 text-sm text-slate-600">
              Link an external identity provider so the user can sign in without a password.
            </p>

            <div className="space-y-5">
              <div>
                <label htmlFor="provider" className={labelClass}>
                  Provider <span className="text-rose-600">*</span>
                </label>
                <select
                  name="provider"
                  id="provider"
                  className={`${inputClass} ${actionData?.fieldErrors?.provider ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                >
                  <option value="">Select a provider</option>
                  <option value="google">Google</option>
                </select>
                {actionData?.fieldErrors?.provider ? (
                  <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.provider}</p>
                ) : null}
                <p className="mt-1.5 text-xs text-slate-500">
                  The identity provider the user will use to sign in.
                </p>
              </div>

              <div>
                <label htmlFor="provider_account_id" className={labelClass}>
                  Provider account ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="provider_account_id"
                  id="provider_account_id"
                  className={`${inputClass} ${actionData?.fieldErrors?.provider_account_id ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  placeholder="Google 'sub' claim, e.g. 1234567890"
                />
                {actionData?.fieldErrors?.provider_account_id ? (
                  <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.provider_account_id}</p>
                ) : null}
                <p className="mt-1.5 text-xs text-slate-500">
                  The unique identifier from the provider (e.g. Google's <code className="rounded bg-slate-100 px-1 text-xs">sub</code> claim).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Role */}
        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">Role</h3>
          <p className="mb-5 text-sm text-slate-600">
            Determines what this user can access in the admin panel.
          </p>

          <div className="space-y-5">
            <div>
              <label htmlFor="role" className={labelClass}>
                Role
              </label>
              <select
                name="role"
                id="role"
                defaultValue="customer"
                className={inputClass}
              >
                <option value="customer">Customer</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                <strong>Customer</strong> — standard end-user. <strong>Admin</strong> — full access.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 sm:p-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating user…" : "Create user"}
          </button>
          <Link
            to="/admin/features/user-management"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
