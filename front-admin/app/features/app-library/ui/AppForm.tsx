import type { FC } from "react";
import { Form } from "@remix-run/react";
import { useState } from "react";
import type { App } from "./AppTable";

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
    <div>
      {/* Top Error Alert */}
      {actionData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="text-sm font-medium text-red-900 mb-1">Error</h4>
          <p className="text-sm text-red-800">{actionData.error}</p>
        </div>
      )}

      <Form method="post" className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white p-6 border border-gray-200 rounded">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Basic Information
          </h3>

          <div className="space-y-5">
            {/* Application Name */}
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Application Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="client_name"
                id="client_name"
                required
                defaultValue={app?.client_name}
                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actionData?.fieldErrors?.client_name
                    ? "border-red-600"
                    : "border-gray-300"
                }`}
                placeholder="E-Cards Application"
              />
              {actionData?.fieldErrors?.client_name && (
                <p className="mt-1.5 text-xs text-red-600">
                  {actionData.fieldErrors.client_name}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                A descriptive name for your application
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                defaultValue={app?.description || ""}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of what this application does..."
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Help users understand the purpose of this application
              </p>
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1.5">
                Logo URL
              </label>
              <input
                type="url"
                name="logo_url"
                id="logo_url"
                defaultValue={app?.logo_url || ""}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Square image recommended (e.g., 256x256px)
              </p>
            </div>
          </div>
        </div>

        {/* URLs Card */}
        <div className="bg-white p-6 border border-gray-200 rounded">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Application URLs
          </h3>

          <div className="space-y-5">
            {/* Development URL */}
            <div>
              <label htmlFor="dev_url" className="block text-sm font-medium text-gray-700 mb-1.5">
                Development URL <span className="text-red-600">*</span>
              </label>
              <input
                type="url"
                name="dev_url"
                id="dev_url"
                required
                defaultValue={app?.dev_url || ""}
                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actionData?.fieldErrors?.dev_url
                    ? "border-red-600"
                    : "border-gray-300"
                }`}
                placeholder="http://localhost:3000"
              />
              {actionData?.fieldErrors?.dev_url && (
                <p className="mt-1.5 text-xs text-red-600">
                  {actionData.fieldErrors.dev_url}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                Local development environment URL
              </p>
            </div>

            {/* Production URL */}
            <div>
              <label htmlFor="prod_url" className="block text-sm font-medium text-gray-700 mb-1.5">
                Production URL
              </label>
              <input
                type="url"
                name="prod_url"
                id="prod_url"
                defaultValue={app?.prod_url || ""}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://app.example.com"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Production environment URL (optional)
              </p>
            </div>
          </div>
        </div>

        {/* OAuth Configuration Card */}
        <div className="bg-white p-6 border border-gray-200 rounded">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            OAuth Configuration
          </h3>

          <div className="space-y-5">
            {/* Redirect URIs */}
            <div>
              <label htmlFor="redirect_uris" className="block text-sm font-medium text-gray-700 mb-1.5">
                Redirect URIs <span className="text-red-600">*</span>
              </label>
              <textarea
                name="redirect_uris"
                id="redirect_uris"
                rows={4}
                required
                defaultValue={app?.redirect_uris.join("\n") || ""}
                className={`w-full px-3 py-2 text-sm border rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actionData?.fieldErrors?.redirect_uris
                    ? "border-red-600"
                    : "border-gray-300"
                }`}
                placeholder="http://localhost:3000/oauth/complete&#10;https://app.example.com/oauth/complete"
              />
              {actionData?.fieldErrors?.redirect_uris && (
                <p className="mt-1.5 text-xs text-red-600">
                  {actionData.fieldErrors.redirect_uris}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                One URI per line. Allowed callback URLs after OAuth authorization
              </p>
            </div>

            {/* Show Advanced Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? "▼" : "▶"} {showAdvanced ? "Hide" : "Show"} Advanced Options
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="pt-4 border-t border-gray-200">
                <div>
                  <label htmlFor="allowed_scopes" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Allowed Scopes
                  </label>
                  <textarea
                    name="allowed_scopes"
                    id="allowed_scopes"
                    rows={3}
                    defaultValue={app?.allowed_scopes.join("\n") || "profile\nemail"}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="profile&#10;email&#10;subscription"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    One scope per line. Default: profile, email
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 border border-gray-200 rounded">
          <h3 className="text-base font-medium text-gray-900 mb-4">Status</h3>

          <div className="flex items-start">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              defaultChecked={app?.is_active ?? false}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="ml-3">
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 block">
                Active
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Users can access and authenticate with this application
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <a
            href="/admin/features/app-library"
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            {mode === "create" ? "Create Application" : "Save Changes"}
          </button>
        </div>
      </Form>
    </div>
  );
};
