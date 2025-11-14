import type { FC } from "react";
import { Link } from "@remix-run/react";

export type User = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
  permissions: string[];
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
};

type Props = {
  users: User[];
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const UserTable: FC<Props> = ({ users, onSort, sortBy, sortOrder }) => {
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

  return (
    <div className="overflow-x-auto bg-white">
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
              onClick={() => handleSort("email")}
              style={{ letterSpacing: "0.01em" }}
            >
              Email{getSortIndicator("email")}
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
              style={{ letterSpacing: "0.01em" }}
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
              onClick={() => handleSort("role")}
              style={{ letterSpacing: "0.01em" }}
            >
              Role{getSortIndicator("role")}
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
              style={{ letterSpacing: "0.01em" }}
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
              onClick={() => handleSort("created_at")}
              style={{ letterSpacing: "0.01em" }}
            >
              Joined{getSortIndicator("created_at")}
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
              style={{ letterSpacing: "0.01em" }}
            >
              Last Login
            </th>
            <th scope="col" className="relative px-6 py-4">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : "—"}
                  </div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900" style={{ textTransform: "capitalize" }}>
                    {user.role}
                  </div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {user.is_email_verified ? (
                    <span className="text-sm font-medium" style={{ color: "#059669" }}>Verified</span>
                  ) : (
                    <span className="text-sm" style={{ color: "#9ca3af" }}>Unverified</span>
                  )}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                  {user.last_login ? formatDate(user.last_login) : "—"}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                  <Link
                    to={`/admin/features/user-management/${user.id}`}
                    className="font-medium"
                    style={{ color: "#2563eb", textDecoration: "none" }}
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
