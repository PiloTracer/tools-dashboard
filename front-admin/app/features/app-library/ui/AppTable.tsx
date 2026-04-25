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
    onSort?.(field);
  };

  const sortLabel = (field: string, label: string) => {
    const active = sortBy === field;
    const arrow = active ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    return (
      <>
        {label}
        <span className="sr-only">{active ? `sorted ${sortOrder === "asc" ? "ascending" : "descending"}` : ""}</span>
        {arrow}
      </>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncate = (str: string | null | undefined, length: number) => {
    if (!str) return "—";
    return str.length > length ? str.substring(0, length) + "…" : str;
  };

  return (
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table className="min-w-[720px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            <th scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
              Logo
            </th>
            <th scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
              {onSort ? (
                <button
                  type="button"
                  onClick={() => handleSort("client_name")}
                  className="rounded-md text-left font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                >
                  {sortLabel("client_name", "Application")}
                </button>
              ) : (
                "Application"
              )}
            </th>
            <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell md:px-5">
              Client ID
            </th>
            <th scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
              URLs
            </th>
            <th scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
              {onSort ? (
                <button
                  type="button"
                  onClick={() => handleSort("is_active")}
                  className="rounded-md text-left font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                >
                  {sortLabel("is_active", "Status")}
                </button>
              ) : (
                "Status"
              )}
            </th>
            <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell lg:px-5">
              {onSort ? (
                <button
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="rounded-md text-left font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                >
                  {sortLabel("created_at", "Created")}
                </button>
              ) : (
                "Created"
              )}
            </th>
            <th scope="col" className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {apps.map((app) => (
            <tr key={app.id} className="transition hover:bg-slate-50/80">
              <td className="px-3 py-3 sm:px-5">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {app.logo_url ? (
                    <img
                      src={app.logo_url}
                      alt=""
                      className="max-h-9 max-w-9 object-contain p-0.5"
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='6' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='14' fill='%2394a3b8'%3E?%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">{app.client_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </td>
              <td className="max-w-[200px] px-3 py-3 sm:max-w-none sm:px-5">
                <div className="truncate text-sm font-semibold text-slate-900">{app.client_name}</div>
                <div className="line-clamp-2 text-xs text-slate-500 sm:text-sm">{truncate(app.description, 64)}</div>
                <div className="mt-1 font-mono text-[11px] text-slate-400 md:hidden">{truncate(app.client_id, 28)}</div>
              </td>
              <td className="hidden max-w-[140px] px-3 py-3 md:table-cell md:px-5">
                <span className="block truncate font-mono text-xs text-slate-600">{app.client_id}</span>
              </td>
              <td className="px-3 py-3 text-xs text-slate-600 sm:px-5 sm:text-sm">
                {app.prod_url ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        Prod
                      </span>
                      <a
                        href={app.prod_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {truncate(app.prod_url, 32)}
                      </a>
                    </div>
                    {app.dev_url ? (
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                          Dev
                        </span>
                        <a
                          href={app.dev_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {truncate(app.dev_url, 32)}
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : app.dev_url ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      Dev
                    </span>
                    <a
                      href={app.dev_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {truncate(app.dev_url, 36)}
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-3 sm:px-5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    app.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {app.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-slate-500 lg:table-cell lg:px-5">
                {formatDate(app.created_at)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right sm:px-5">
                <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:justify-end sm:gap-2">
                  <Link
                    to={`/admin/features/app-library/${app.id}`}
                    className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-3 sm:text-sm"
                  >
                    View
                  </Link>
                  <Link
                    to={`/admin/features/app-library/${app.id}?tab=registration&edit=1`}
                    className="inline-flex rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-3 sm:text-sm"
                  >
                    Edit registration
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
