import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { AppTable, type App } from "../features/app-library/ui/AppTable";
import { useState } from "react";

type LoaderData = {
  apps: App[];
  total: number;
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

  try {
    // Fetch apps from admin endpoint
    const response = await fetch(
      `${apiUrl}/api/admin/app-library?include_deleted=${includeDeleted}`,
      {
        headers: {
          // TODO: Add Authorization header with admin JWT token
          // "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.status}`);
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Application Library
        </h1>
        <p className="text-sm text-gray-600">
          Manage OAuth 2.0 applications and integrations
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
            className="px-3 py-2 text-sm border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Applications</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search..."
            className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-700 w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Link
          to="/admin/features/app-library/new"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Create Application
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-200 rounded">
          <div className="text-xs uppercase font-medium text-gray-500 mb-2">
            Total
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {data.total}
          </div>
        </div>
        <div className="bg-white p-5 border border-gray-200 rounded">
          <div className="text-xs uppercase font-medium text-gray-500 mb-2">
            Active
          </div>
          <div className="text-2xl font-semibold text-green-600">
            {data.apps.filter((app) => app.is_active).length}
          </div>
        </div>
        <div className="bg-white p-5 border border-gray-200 rounded">
          <div className="text-xs uppercase font-medium text-gray-500 mb-2">
            Inactive
          </div>
          <div className="text-2xl font-semibold text-gray-400">
            {data.apps.filter((app) => !app.is_active).length}
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      {data.apps.length === 0 ? (
        <div className="bg-white p-12 border border-gray-200 rounded text-center">
          <h3 className="mb-3 text-lg font-medium text-gray-900">
            No applications found
          </h3>
          <p className="mb-6 text-sm text-gray-600">
            Get started by creating your first OAuth 2.0 application
          </p>
          <Link
            to="/admin/features/app-library/new"
            className="inline-block px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Create Application
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <AppTable
            apps={data.apps}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      )}
    </div>
  );
}
