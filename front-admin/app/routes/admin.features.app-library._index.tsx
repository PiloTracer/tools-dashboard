import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { AppTable, type App } from "../features/app-library/ui/AppTable";
import { useState } from "react";
import { getAdminApiAuthHeaders } from "../utils/admin-api-auth.server";

type LoaderData = {
  apps: App[];
  total: number;
  loadError?: string;
};

/**
 * Loader: Fetch applications from back-api
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const includeDeleted = url.searchParams.get("include_deleted") === "true";
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";

  const apiUrl = process.env.API_URL || "http://back-api:8000";
  const auth = getAdminApiAuthHeaders(request);

  try {
    if (!auth.Authorization) {
      return json<LoaderData>({
        apps: [],
        total: 0,
        loadError: "Sign in to the admin console to view applications.",
      });
    }

    // Fetch apps from admin endpoint
    const response = await fetch(
      `${apiUrl}/api/admin/app-library?include_deleted=${includeDeleted}`,
      {
        headers: auth,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return json<LoaderData>({
        apps: [],
        total: 0,
        loadError: `Could not load applications (HTTP ${response.status}). ${
          errText.slice(0, 200) || ""
        }`.trim(),
      });
    }

    const data = await response.json();

    // Apply sorting on client side (backend doesn't support it yet)
    let sortedApps = data.apps || [];
    sortedApps.sort((a: App, b: App) => {
      let aVal = a[sortBy as keyof App];
      let bVal = b[sortBy as keyof App];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortOrder === "asc"
          ? (aVal ? 1 : 0) - (bVal ? 1 : 0)
          : (bVal ? 1 : 0) - (aVal ? 1 : 0);
      }

      return 0;
    });

    return json<LoaderData>({
      apps: sortedApps,
      total: data.total || 0,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return json<LoaderData>({
      apps: [],
      total: 0,
      loadError:
        error instanceof Error
          ? error.message
          : "Failed to load applications.",
    });
  }
}

export default function AppLibraryIndex() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");

  const handleSort = (field: string) => {
    const currentSortBy = searchParams.get("sort_by") || "created_at";
    const currentSortOrder = searchParams.get("sort_order") || "desc";

    const newSortOrder =
      currentSortBy === field && currentSortOrder === "asc" ? "desc" : "asc";

    setSearchParams((prev) => {
      prev.set("sort_by", field);
      prev.set("sort_order", newSortOrder);
      return prev;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      if (searchInput) {
        prev.set("search", searchInput);
      } else {
        prev.delete("search");
      }
      return prev;
    });
  };

  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-4 lg:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Application library
        </h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">
          Manage OAuth 2.0 clients and integrations. In the last column, use View for the summary
          or Edit registration to open the full client settings (URLs, redirect URIs, scopes, and
          metadata).
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <form onSubmit={handleSearch} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={searchParams.get("status") || "all"}
            onChange={(e) => {
              setSearchParams((prev) => {
                if (e.target.value === "all") {
                  prev.delete("status");
                } else {
                  prev.set("status", e.target.value);
                }
                return prev;
              });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-48"
          >
            <option value="all">All applications</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name…"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 sm:shrink-0"
          >
            Search
          </button>
        </form>

        <Link
          to="/admin/features/app-library/new"
          className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >
          Create application
        </Link>
      </div>

      {data.loadError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {data.loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{data.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {data.apps.filter((app) => app.is_active).length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-950/5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inactive</div>
          <div className="mt-1 text-2xl font-bold text-slate-400">
            {data.apps.filter((app) => !app.is_active).length}
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      {data.apps.length === 0 && !data.loadError ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center ring-1 ring-slate-950/5">
          <h3 className="text-lg font-semibold text-slate-900">No applications yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Create an OAuth client to connect first-party or partner apps to the dashboard.
          </p>
          <Link
            to="/admin/features/app-library/new"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Create application
          </Link>
        </div>
      ) : data.apps.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/5">
          <AppTable
            apps={data.apps}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      ) : null}
    </div>
  );
}
