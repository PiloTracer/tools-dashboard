import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  Link,
  Form,
  useNavigate,
  useLocation,
} from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import type { App } from "../features/app-library/ui/AppTable";
import { getAdminApiAuthHeaders } from "../utils/admin-api-auth.server";

export type AppLibraryTab = "overview" | "registration" | "oauth" | "access";

type LoaderData = {
  app: App;
  accessRule?: Record<string, unknown> | null;
  newSecret?: string; // Only populated when ?new=true&secret=xxx
  initialTab: AppLibraryTab;
  startEditing: boolean;
};

type ActionData = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** Returned only for regenerate_secret (do not pass through redirect). */
  regeneratedClientSecret?: string;
};

/**
 * Loader: Fetch application details
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const appId = params.appId;

  if (!appId) {
    throw new Response("Application ID is required", { status: 400 });
  }

  const url = new URL(request.url);
  const isNew = url.searchParams.get("new") === "true";
  const secret = url.searchParams.get("secret");
  const tabParam = url.searchParams.get("tab");
  const editParam = url.searchParams.get("edit");
  const validTabs: AppLibraryTab[] = ["overview", "registration", "oauth", "access"];
  const normalizedTab =
    tabParam === "details" ? "registration" : tabParam;
  const initialTab: AppLibraryTab = validTabs.includes(normalizedTab as AppLibraryTab)
    ? (normalizedTab as AppLibraryTab)
    : "overview";
  const startEditing = editParam === "1" || editParam === "true";

  const apiUrl = process.env.API_URL || "http://back-api:8000";
  const auth = getAdminApiAuthHeaders(request);

  try {
    // Fetch app details
    const response = await fetch(`${apiUrl}/api/admin/app-library/${appId}`, {
      headers: { ...auth },
    });

    if (response.status === 404) {
      throw new Response("Application not found", { status: 404 });
    }

    if (!response.ok) {
      throw new Response("Failed to fetch application", {
        status: response.status,
      });
    }

    const data = await response.json();

    // TODO: Fetch access rules when implemented
    // const accessRuleResponse = await fetch(`${apiUrl}/api/admin/app-library/${appId}/access-rules`);
    // const accessRule = accessRuleResponse.ok ? await accessRuleResponse.json() : null;

    return json<LoaderData>({
      app: data.app,
      accessRule: data.access_rule ?? null,
      newSecret: isNew && secret ? secret : undefined,
      initialTab,
      startEditing,
    });
  } catch (error) {
    console.error("Error fetching application:", error);
    throw error;
  }
}

/**
 * Action: Handle application updates, secret regeneration, status toggle, and deletion
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const appId = params.appId;

  if (!appId) {
    return json<ActionData>(
      { error: "Application ID is required" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const _action = formData.get("_action")?.toString();

  const apiUrl = process.env.API_URL || "http://back-api:8000";
  const auth = getAdminApiAuthHeaders(request);

  try {
    switch (_action) {
      case "update": {
        // Update application details
        const client_name = formData.get("client_name")?.toString();
        const description = formData.get("description")?.toString() || null;
        const logo_url = formData.get("logo_url")?.toString() || null;
        const dev_url = formData.get("dev_url")?.toString();
        const prod_url = formData.get("prod_url")?.toString() || null;
        const redirect_uris_raw = formData.get("redirect_uris")?.toString();
        const allowed_scopes_raw = formData.get("allowed_scopes")?.toString();
        const is_active = formData.get("is_active") === "on";

        // Validation
        const fieldErrors: Record<string, string> = {};

        if (!client_name) {
          fieldErrors.client_name = "Application name is required";
        }

        if (!dev_url) {
          fieldErrors.dev_url = "Development URL is required";
        }

        if (!redirect_uris_raw) {
          fieldErrors.redirect_uris = "At least one redirect URI is required";
        }

        if (Object.keys(fieldErrors).length > 0) {
          return json<ActionData>({ fieldErrors });
        }

        // Parse redirect URIs and scopes
        const redirect_uris = redirect_uris_raw!
          .split("\n")
          .map((uri) => uri.trim())
          .filter((uri) => uri.length > 0);

        const allowed_scopes = allowed_scopes_raw
          ? allowed_scopes_raw
              .split("\n")
              .map((scope) => scope.trim())
              .filter((scope) => scope.length > 0)
          : ["profile", "email"];

        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...auth,
            },
            body: JSON.stringify({
              client_name,
              description,
              logo_url,
              dev_url,
              prod_url,
              redirect_uris,
              allowed_scopes,
              is_active,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail || `Failed to update application: ${response.status}`,
          });
        }

        return json<ActionData>({ success: true });
      }

      case "regenerate_secret": {
        // Regenerate client secret
        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}/regenerate-secret`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...auth,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail ||
              `Failed to regenerate secret: ${response.status}`,
          });
        }

        const data = (await response.json()) as { client_secret?: string };
        const newSecret = data.client_secret;
        if (!newSecret) {
          return json<ActionData>(
            { error: "Invalid response from server (no client secret)" },
            { status: 502 }
          );
        }
        return json<ActionData>({ regeneratedClientSecret: newSecret });
      }

      case "toggle_status": {
        // Toggle active status
        const currentStatus = formData.get("current_status") === "true";
        const newStatus = !currentStatus;

        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...auth,
            },
            body: JSON.stringify({
              is_active: newStatus,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail || `Failed to toggle status: ${response.status}`,
          });
        }

        return json<ActionData>({ success: true });
      }

      case "delete": {
        // Soft delete application
        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "DELETE",
            headers: {
              ...auth,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail ||
              `Failed to delete application: ${response.status}`,
          });
        }

        // Redirect to app library index
        return redirect("/admin/features/app-library");
      }

      default:
        return json<ActionData>(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error performing action:", error);
    return json<ActionData>(
      { error: "Network error. Please try again." },
      { status: 500 }
    );
  }
}

function appLibrarySearch(tab: AppLibraryTab, options?: { edit?: boolean }) {
  const p = new URLSearchParams();
  if (tab !== "overview") p.set("tab", tab);
  if (options?.edit) p.set("edit", "1");
  const q = p.toString();
  return q ? `?${q}` : "";
}

export default function AppLibraryDetail() {
  const { app, newSecret, accessRule, initialTab, startEditing } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeTab, setActiveTab] = useState<AppLibraryTab>(initialTab);
  const [isEditing, setIsEditing] = useState(startEditing);

  useEffect(() => {
    setActiveTab(initialTab);
    setIsEditing(startEditing);
  }, [app.id, initialTab, startEditing]);

  useEffect(() => {
    if (actionData?.success) {
      setIsEditing(false);
    }
  }, [actionData?.success]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [revealFromRegen, setRevealFromRegen] = useState<string | null>(null);
  const [regenUI, setRegenUI] = useState<
    null | { step: "confirm" } | { step: "success"; secret: string }
  >(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const statusFetcher = useFetcher();
  const regenFetcher = useFetcher<typeof action>();
  const RegenForm = regenFetcher.Form;
  const regenSubmitPendingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const displayedNewSecret = newSecret ?? revealFromRegen;

  const openRegenModal = () => {
    regenSubmitPendingRef.current = false;
    setRegenUI({ step: "confirm" });
  };

  const closeRegenModal = () => {
    setRegenUI(null);
  };

  const completeRegenAndShowBanner = () => {
    if (regenUI?.step === "success") {
      setRevealFromRegen(regenUI.secret);
    }
    const p = new URLSearchParams(location.search);
    p.delete("new");
    p.delete("secret");
    const q = p.toString();
    navigate(
      { pathname: location.pathname, search: q ? `?${q}` : "" },
      { replace: true }
    );
    setRegenUI(null);
  };

  useEffect(() => {
    setRevealFromRegen(null);
  }, [app.id]);

  useEffect(() => {
    if (regenFetcher.state !== "idle" || !regenSubmitPendingRef.current) {
      return;
    }
    const d = regenFetcher.data as ActionData | undefined;
    regenSubmitPendingRef.current = false;
    if (d?.error) {
      return;
    }
    if (d?.regeneratedClientSecret) {
      setRegenUI({ step: "success", secret: d.regeneratedClientSecret });
    }
  }, [regenFetcher.state, regenFetcher.data]);

  const copyToClipboard = async (text: string, type: "secret" | "clientId") => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          if (type === "secret") {
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2000);
          } else {
            setClientIdCopied(true);
            setTimeout(() => setClientIdCopied(false), 2000);
          }
        } finally {
          document.body.removeChild(textArea);
        }
        return;
      }

      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 2000);
      } else {
        setClientIdCopied(true);
        setTimeout(() => setClientIdCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isActive =
    statusFetcher.formData?.get("current_status") === "false"
      ? true
      : statusFetcher.formData?.get("current_status") === "true"
      ? false
      : app.is_active;

  const cardSurface =
    "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 sm:p-6";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 pb-12 pt-2 sm:px-4 lg:px-0">
      <div>
        <Link
          to="/admin/features/app-library"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Application library
        </Link>

        <div
          className={`mt-5 flex flex-col gap-4 ${cardSurface} sm:flex-row sm:items-start sm:justify-between`}
        >
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
              {app.logo_url && !logoFailed ? (
                <img
                  src={app.logo_url}
                  alt=""
                  className="max-h-12 max-w-12 object-contain p-1"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="text-lg font-semibold text-slate-500">
                  {app.client_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {app.client_name}
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                {app.description || "No description provided"}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:min-w-[10rem] sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                to={`/admin/features/app-library/${app.id}${appLibrarySearch("overview")}`}
                onClick={() => {
                  setActiveTab("overview");
                  setIsEditing(false);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Overview
              </Link>
              <Link
                to={`/admin/features/app-library/${app.id}${appLibrarySearch("registration", { edit: true })}`}
                onClick={() => {
                  setActiveTab("registration");
                  setIsEditing(true);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Edit registration
              </Link>
            </div>
          </div>
        </div>
      </div>

      {displayedNewSecret && (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 shadow-sm ring-1 ring-amber-900/10 sm:p-5"
          role="alert"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-950">
                Save this client secret now — it will not be shown again.
              </h3>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <code className="block flex-1 break-all rounded-lg border border-amber-200/80 bg-white px-3 py-2 font-mono text-xs text-amber-950 sm:text-sm">
                  {displayedNewSecret}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayedNewSecret, "secret")}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  {secretCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionData?.error && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 shadow-sm ring-1 ring-red-900/10"
          role="alert"
        >
          {actionData.error}
        </div>
      )}

      {actionData?.success && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-900/10"
          role="status"
        >
          Application updated successfully.
        </div>
      )}

      <div className={`${cardSurface} !p-0`}>
        <nav
          className="-mb-px flex gap-1 overflow-x-auto overscroll-x-contain border-b border-slate-200 px-2 pt-1 sm:gap-2 sm:px-4"
          aria-label="Application sections"
        >
          {(
            [
              { id: "overview" as const, label: "Overview" },
              { id: "registration" as const, label: "Registration" },
              { id: "oauth" as const, label: "OAuth" },
              { id: "access" as const, label: "Access" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== "registration") setIsEditing(false);
              }}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className={cardSurface}>
              <h3 className="mb-4 text-lg font-semibold text-slate-900">OAuth credentials</h3>
              <dl className="grid grid-cols-1 gap-6">
                <div>
                  <dt className="mb-2 text-sm font-medium text-slate-500">Client ID</dt>
                  <dd className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 sm:text-sm">
                      {app.client_id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(app.client_id, "clientId")}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {clientIdCopied ? "Copied" : "Copy"}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-sm font-medium text-slate-500">Client secret</dt>
                  <dd className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm tracking-widest text-slate-400">
                      ••••••••••••••••••••
                    </code>
                    <button
                      type="button"
                      onClick={openRegenModal}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Regenerate
                    </button>
                  </dd>
                  <p className="mt-2 text-xs text-slate-500">
                    The secret is never returned from the API after creation. Regenerate to issue a new one.
                  </p>
                </div>
              </dl>
            </div>

            <div className={cardSurface}>
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Application metadata</h3>
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500 mb-1">
                    Application ID
                  </dt>
                  <dd className="break-all text-sm text-slate-900">{app.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 mb-1">
                    Status
                  </dt>
                  <dd>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 mb-1">
                    Created At
                  </dt>
                  <dd className="text-sm text-slate-900">
                    {formatDate(app.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 mb-1">
                    Last Updated
                  </dt>
                  <dd className="text-sm text-slate-900">
                    {formatDate(app.updated_at)}
                  </dd>
                </div>
                {app.deleted_at && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-red-500 mb-1">
                      Deleted At
                    </dt>
                    <dd className="text-sm text-red-900">
                      {formatDate(app.deleted_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm ring-1 ring-indigo-950/5 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">Change registration settings</h3>
              <p className="mt-1 text-sm text-slate-600">
                Update app name, URLs, redirect URIs, OAuth scopes, logo, and active state on the
                Registration tab.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  to={`/admin/features/app-library/${app.id}${appLibrarySearch("registration", { edit: true })}`}
                  onClick={() => {
                    setActiveTab("registration");
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Open registration editor
                </Link>
                <Link
                  to={`/admin/features/app-library/${app.id}${appLibrarySearch("registration")}`}
                  onClick={() => {
                    setActiveTab("registration");
                    setIsEditing(false);
                  }}
                  className="inline-flex items-center justify-center text-sm font-medium text-indigo-700 hover:text-indigo-900"
                >
                  View read-only
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Registration tab */}
        {activeTab === "registration" && (
          <div className={cardSurface}>
            {!isEditing ? (
              <div>
                <div className="mb-2">
                  <p className="text-sm text-slate-600">
                    Name, description, logo, dev/prod URLs, redirect URIs, allowed scopes, and
                    whether the client is active. This is the full remote OAuth client registration
                    for this app.
                  </p>
                </div>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Registration</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                  >
                    Edit registration
                  </button>
                </div>
                <dl className="grid grid-cols-1 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">
                      Application Name
                    </dt>
                    <dd className="text-sm text-slate-900">{app.client_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">
                      Description
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {app.description || "No description provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">
                      Logo URL
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {app.logo_url || "No logo URL"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">
                      Development URL
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {app.dev_url || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">
                      Production URL
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {app.prod_url || "Not set"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <Form method="post">
                <input type="hidden" name="_action" value="update" />
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    Edit registration
                  </h3>

                  {/* Application Name */}
                  <div>
                    <label
                      htmlFor="client_name"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Application Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      id="client_name"
                      required
                      defaultValue={app.client_name}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    {actionData?.fieldErrors?.client_name && (
                      <p className="mt-2 text-sm text-red-600">
                        {actionData.fieldErrors.client_name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      defaultValue={app.description || ""}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Brief description of the application..."
                    />
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label
                      htmlFor="logo_url"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Logo URL
                    </label>
                    <input
                      type="url"
                      name="logo_url"
                      id="logo_url"
                      defaultValue={app.logo_url || ""}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  {/* Development URL */}
                  <div>
                    <label
                      htmlFor="dev_url"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Development URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      name="dev_url"
                      id="dev_url"
                      required
                      defaultValue={app.dev_url || ""}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="http://localhost:3000"
                    />
                  </div>

                  {/* Production URL */}
                  <div>
                    <label
                      htmlFor="prod_url"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Production URL
                    </label>
                    <input
                      type="url"
                      name="prod_url"
                      id="prod_url"
                      defaultValue={app.prod_url || ""}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://app.example.com"
                    />
                  </div>

                  {/* Redirect URIs */}
                  <div>
                    <label
                      htmlFor="redirect_uris"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Redirect URIs <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="redirect_uris"
                      id="redirect_uris"
                      rows={4}
                      required
                      defaultValue={app.redirect_uris.join("\n")}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs"
                    />
                    <p className="mt-1 text-sm text-slate-500">
                      One URI per line
                    </p>
                  </div>

                  {/* Allowed Scopes */}
                  <div>
                    <label
                      htmlFor="allowed_scopes"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Allowed Scopes
                    </label>
                    <textarea
                      name="allowed_scopes"
                      id="allowed_scopes"
                      rows={3}
                      defaultValue={app.allowed_scopes.join("\n")}
                      className="mt-1 block w-full border border-slate-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs"
                    />
                    <p className="mt-1 text-sm text-slate-500">
                      One scope per line
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={app.is_active}
                        className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-slate-900">
                        Active (Users can access this application)
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex justify-center py-2 px-4 border border-slate-200 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </div>
        )}

        {/* OAuth Configuration Tab */}
        {activeTab === "oauth" && (
          <div className={cardSurface}>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">OAuth (read-only)</h3>
            <p className="mb-6 text-sm text-slate-600">
              Redirect URIs and scopes are part of the client registration. To change them, use{" "}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("registration");
                  setIsEditing(true);
                }}
                className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
              >
                Edit registration
              </button>{" "}
              on the Registration tab (or the button below).
            </p>
            <div className="mb-6">
              <Link
                to={`/admin/features/app-library/${app.id}${appLibrarySearch("registration", { edit: true })}`}
                onClick={() => {
                  setActiveTab("registration");
                  setIsEditing(true);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Edit redirect URIs &amp; scopes
              </Link>
            </div>
            <dl className="grid grid-cols-1 gap-6">
              <div>
                <dt className="text-sm font-medium text-slate-500 mb-2">
                  Redirect URIs
                </dt>
                <dd className="space-y-2">
                  {app.redirect_uris.map((uri, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 px-4 py-2 rounded border border-slate-200 font-mono text-sm"
                    >
                      {uri}
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 mb-2">
                  Allowed Scopes
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {app.allowed_scopes.map((scope, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800"
                    >
                      {scope}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Access Control Tab */}
        {activeTab === "access" && (
          <div className={cardSurface}>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Access control</h3>
            <p className="mb-6 text-sm text-slate-600">
              Who may launch or authorize this app (in addition to global OAuth client settings) is
              defined here. Advanced editing may use the admin API; the Registration tab holds URL
              and client metadata.
            </p>
            {accessRule ? (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Mode</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {String(accessRule.mode ?? "—")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">User IDs (if applicable)</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-slate-800">
                    {Array.isArray(accessRule.user_ids) && accessRule.user_ids.length > 0
                      ? (accessRule.user_ids as unknown[]).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">Subscription tiers (if applicable)</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {Array.isArray(accessRule.subscription_tiers) && accessRule.subscription_tiers.length > 0
                      ? (accessRule.subscription_tiers as string[]).join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
                <p className="text-sm text-slate-600">
                  No custom access rule is stored for this app yet. Default product behavior may
                  still allow eligible users to connect.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  To manage OAuth client fields (redirect URIs, URLs, scopes), use the Registration tab.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`${cardSurface} border-rose-100/80`}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Danger zone</h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Application status</h4>
              <p className="mt-1 text-sm text-slate-600">
                {isActive
                  ? "Active — users and clients can use this application."
                  : "Inactive — OAuth flows for this client are blocked."}
              </p>
            </div>
            <statusFetcher.Form method="post" className="shrink-0">
              <input type="hidden" name="_action" value="toggle_status" />
              <input type="hidden" name="current_status" value={isActive.toString()} />
              <button
                type="submit"
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${
                  isActive
                    ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                    : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                }`}
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </statusFetcher.Form>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Delete application</h4>
              <p className="mt-1 text-sm text-slate-600">
                Permanently remove this client and revoke all tokens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full shrink-0 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:w-auto"
            >
              Delete application
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-app-title">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]"
            aria-label="Close dialog"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-950/10">
            <div className="flex gap-4 p-5 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-app-title" className="text-lg font-semibold text-slate-900">
                  Delete application?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  This cannot be undone. OAuth tokens and authorizations for{" "}
                  <span className="font-medium text-slate-900">{app.client_name}</span> will be revoked.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <Form method="post">
                <input type="hidden" name="_action" value="delete" />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 sm:w-auto"
                >
                  Delete permanently
                </button>
              </Form>
            </div>
          </div>
        </div>
      ) : null}

      {regenUI ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            regenUI.step === "confirm" ? "regen-secret-confirm-title" : "regen-secret-success-title"
          }
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]"
            aria-label="Close dialog"
            onClick={() => {
              if (regenUI.step === "success") {
                completeRegenAndShowBanner();
              } else {
                closeRegenModal();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-950/10">
            {regenUI.step === "confirm" ? (
              <>
                <div className="flex gap-4 p-5 sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 id="regen-secret-confirm-title" className="text-lg font-semibold text-slate-900">
                      Regenerate client secret?
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      The current secret stops working immediately. Update every deployment that uses this client before continuing.
                    </p>
                    {regenFetcher.data && (regenFetcher.data as ActionData).error && (
                      <p className="mt-3 text-sm text-red-700" role="alert">
                        {(regenFetcher.data as ActionData).error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
                  <button
                    type="button"
                    onClick={closeRegenModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <RegenForm
                    method="post"
                    onSubmit={() => {
                      regenSubmitPendingRef.current = true;
                    }}
                  >
                    <input type="hidden" name="_action" value="regenerate_secret" />
                    <button
                      type="submit"
                      disabled={regenFetcher.state !== "idle"}
                      className="w-full min-w-[10rem] rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {regenFetcher.state === "submitting" ? "Regenerating…" : "Regenerate secret"}
                    </button>
                  </RegenForm>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 id="regen-secret-success-title" className="text-lg font-semibold text-slate-900">
                        New client secret
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Copy and store it safely. The previous secret is invalid. When you are done, close this dialog — the same secret will also appear in the warning banner for a moment.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg border border-emerald-200/80 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900">
                      {regenUI.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(regenUI.secret, "secret")}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      {secretCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:px-6 sm:py-4 sm:text-right">
                  <button
                    type="button"
                    onClick={completeRegenAndShowBanner}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
