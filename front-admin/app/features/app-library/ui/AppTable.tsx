import type { FC } from "react";
import { Link } from "@remix-run/react";

export type App = {
  id: string;
  client_id: string;
  client_name: string;
  description?: string | null;
  logo_url?: string | null;
  dev_url?: string | null;
  prod_url?: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: number | null;
};

type Props = {
  apps: App[];
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const AppTable: FC<Props> = ({ apps, onSort, sortBy, sortOrder }) => {
  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncate = (str: string | null | undefined, length: number) => {
    if (!str) return "-";
    return str.length > length ? str.substring(0, length) + "..." : str;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Logo
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("client_name")}
            >
              Application Name{getSortIndicator("client_name")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Client ID
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              URLs
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("is_active")}
            >
              Status{getSortIndicator("is_active")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("created_at")}
            >
              Created{getSortIndicator("created_at")}
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? null : (
            apps.map((app, index) => (
              <tr
                key={app.id}
                className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {app.logo_url ? (
                    <img
                      src={app.logo_url}
                      alt={app.client_name}
                      className="h-10 w-10 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23E5E7EB'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239CA3AF'%3E%3F%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-lg font-semibold">
                        {app.client_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {app.client_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {truncate(app.description, 50)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  {app.client_id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {app.prod_url ? (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mr-2">
                          PROD
                        </span>
                        <a
                          href={app.prod_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {truncate(app.prod_url, 25)}
                        </a>
                      </div>
                      {app.dev_url && (
                        <div className="flex items-center">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                            DEV
                          </span>
                          <a
                            href={app.dev_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {truncate(app.dev_url, 25)}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : app.dev_url ? (
                    <div className="flex items-center">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                        DEV
                      </span>
                      <a
                        href={app.dev_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {truncate(app.dev_url, 30)}
                      </a>
                    </div>
                  ) : (
                    <span className="text-gray-400">No URLs</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      app.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {app.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(app.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    to={`/admin/features/app-library/${app.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
