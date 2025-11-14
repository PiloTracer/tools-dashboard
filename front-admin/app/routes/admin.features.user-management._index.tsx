import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { UserTable, type User } from "../features/user-management/ui/UserTable";
import { useState } from "react";

type LoaderData = {
  users: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

/**
 * Loader: Fetch users from back-api with pagination and filters
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const pageSize = url.searchParams.get("page_size") || "20";
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") || "";
  const status = url.searchParams.get("status") || "";
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";

  // Build query params for back-api
  const apiUrl = process.env.API_URL || "http://back-api:8000";
  const queryParams = new URLSearchParams({
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  if (search) queryParams.append("search", search);
  if (role) queryParams.append("role", role);
  if (status) queryParams.append("status", status);

  try {
    // TODO: Add Authorization header with admin JWT token
    const response = await fetch(`${apiUrl}/admin/users?${queryParams}`, {
      headers: {
        // "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();

    return json<LoaderData>({
      users: data.users || [],
      total: data.total || 0,
      page: data.page || 1,
      page_size: data.page_size || 20,
      total_pages: data.total_pages || 0,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    // Return empty data on error
    return json<LoaderData>({
      users: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    });
  }
}

export default function UserManagementIndex() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const currentPage = parseInt(searchParams.get("page") || "1");
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc";

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort_by", field);
    newParams.set("sort_order", newOrder);
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput) {
      newParams.set("search", searchInput);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1"); // Reset to page 1 on new search
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const handleRoleFilter = (role: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (role) {
      newParams.set("role", role);
    } else {
      newParams.delete("role");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
          letterSpacing: "-0.01em"
        }}>
          User Management
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#6b7280",
          fontWeight: 400
        }}>
          Manage user accounts, roles, and permissions. <span style={{ color: "#9ca3af" }}>Total users: {data.total}</span>
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          {/* Search */}
          <form onSubmit={handleSearch}>
            <label htmlFor="search" style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "6px"
            }}>
              Search by email
            </label>
            <div style={{ display: "flex", gap: "0" }}>
              <input
                type="text"
                name="search"
                id="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter email address"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderTopLeftRadius: "6px",
                  borderBottomLeftRadius: "6px",
                  borderRight: "none",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "#2563eb",
                  border: "1px solid #2563eb",
                  borderTopRightRadius: "6px",
                  borderBottomRightRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Role Filter */}
          <div>
            <label htmlFor="role-filter" style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "6px"
            }}>
              Filter by role
            </label>
            <select
              id="role-filter"
              value={searchParams.get("role") || ""}
              onChange={(e) => handleRoleFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                outline: "none"
              }}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="support">Support</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        overflow: "hidden"
      }}>
        <UserTable
          users={data.users}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= data.total_pages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{data.total_pages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  ←
                </button>
                {Array.from({ length: data.total_pages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === data.total_pages ||
                      Math.abs(page - currentPage) <= 2
                  )
                  .map((page, idx, arr) => (
                    <>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          page === currentPage
                            ? "z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        }`}
                      >
                        {page}
                      </button>
                    </>
                  ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= data.total_pages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
