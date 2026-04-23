import type { FC } from "react";
import { Form, Link } from "@remix-run/react";
import { useState } from "react";
import type { App } from "./AppTable";

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 sm:p-6";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "block text-sm font-medium text-slate-700";

type Props = {
  app?: App;
  mode: "create" | "edit";
  actionData?: {
    error?: string;
    fieldErrors?: Record<string, string>;
  };
};

export const AppForm: FC<Props> = ({ app, mode, actionData }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {actionData?.error ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 shadow-sm ring-1 ring-red-900/10"
          role="alert"
        >
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-red-800">{actionData.error}</p>
        </div>
      ) : null}

      <Form method="post" className="space-y-6">
        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">Basic information</h3>
          <p className="mb-5 text-sm text-slate-600">Name and branding shown in the admin library.</p>

          <div className="space-y-5">
            <div>
              <label htmlFor="client_name" className={labelClass}>
                Application name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="client_name"
                id="client_name"
                required
                defaultValue={app?.client_name}
                className={`${inputClass} ${actionData?.fieldErrors?.client_name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                placeholder="E.g. E-Cards (Development)"
              />
              {actionData?.fieldErrors?.client_name ? (
                <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.client_name}</p>
              ) : null}
              <p className="mt-1.5 text-xs text-slate-500">A clear, human-readable name for operators.</p>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                defaultValue={app?.description || ""}
                className={inputClass}
                placeholder="What this client integrates with the platform for…"
              />
              <p className="mt-1.5 text-xs text-slate-500">Optional; helps your team pick the right client.</p>
            </div>

            <div>
              <label htmlFor="logo_url" className={labelClass}>
                Logo URL
              </label>
              <input
                type="url"
                name="logo_url"
                id="logo_url"
                defaultValue={app?.logo_url || ""}
                className={inputClass}
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1.5 text-xs text-slate-500">Square image recommended; displayed at small sizes in lists.</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">Application URLs</h3>
          <p className="mb-5 text-sm text-slate-600">Where this app runs in dev and production.</p>

          <div className="space-y-5">
            <div>
              <label htmlFor="dev_url" className={labelClass}>
                Development URL <span className="text-rose-600">*</span>
              </label>
              <input
                type="url"
                name="dev_url"
                id="dev_url"
                required
                defaultValue={app?.dev_url || ""}
                className={`${inputClass} ${actionData?.fieldErrors?.dev_url ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                placeholder="http://localhost:3000"
              />
              {actionData?.fieldErrors?.dev_url ? (
                <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.dev_url}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="prod_url" className={labelClass}>
                Production URL
              </label>
              <input
                type="url"
                name="prod_url"
                id="prod_url"
                defaultValue={app?.prod_url || ""}
                className={inputClass}
                placeholder="https://app.example.com"
              />
              <p className="mt-1.5 text-xs text-slate-500">Optional.</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-1 text-base font-semibold text-slate-900">OAuth configuration</h3>
          <p className="mb-5 text-sm text-slate-600">Redirect URIs must match what you register at the authorization server.</p>

          <div className="space-y-5">
            <div>
              <label htmlFor="redirect_uris" className={labelClass}>
                Redirect URIs <span className="text-rose-600">*</span>
              </label>
              <textarea
                name="redirect_uris"
                id="redirect_uris"
                rows={4}
                required
                defaultValue={app?.redirect_uris.join("\n") || ""}
                className={`${inputClass} font-mono text-xs sm:text-sm ${actionData?.fieldErrors?.redirect_uris ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                placeholder={"http://localhost:3000/oauth/callback\nhttps://app.example.com/oauth/callback"}
              />
              {actionData?.fieldErrors?.redirect_uris ? (
                <p className="mt-1.5 text-xs text-rose-600">{actionData.fieldErrors.redirect_uris}</p>
              ) : null}
              <p className="mt-1.5 text-xs text-slate-500">One URI per line.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-semibold text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline"
            >
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>

            {showAdvanced ? (
              <div className="border-t border-slate-100 pt-5">
                <label htmlFor="allowed_scopes" className={labelClass}>
                  Allowed scopes
                </label>
                <textarea
                  name="allowed_scopes"
                  id="allowed_scopes"
                  rows={3}
                  defaultValue={app?.allowed_scopes.join("\n") || "profile\nemail"}
                  className={`${inputClass} font-mono text-xs sm:text-sm`}
                  placeholder={"profile\nemail"}
                />
                <p className="mt-1.5 text-xs text-slate-500">One scope per line. Defaults: profile, email.</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Status</h3>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              defaultChecked={app?.is_active ?? false}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="is_active" className="text-sm font-medium text-slate-800">
                Application is active
              </label>
              <p className="mt-0.5 text-xs text-slate-500">Inactive clients cannot complete OAuth until re-enabled.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link
            to="/admin/features/app-library"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {mode === "create" ? "Create application" : "Save changes"}
          </button>
        </div>
      </Form>
    </div>
  );
};
