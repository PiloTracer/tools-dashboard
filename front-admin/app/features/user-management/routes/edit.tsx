import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Link, useFetcher } from "@remix-run/react";
import { UserForm, type UserFormData } from "../ui/UserForm";

type LoaderData = {
  user: UserFormData & {
    id: number;
    role: string;
    permissions: string[];
    is_email_verified: boolean;
    created_at: string;
    updated_at: string;
    profile_completion_percentage: number;
    login_count: number;
    last_login: string | null;
  };
};

type ActionData = {
  errors?: Record<string, string>;
  success?: boolean;
};

/**
 * Loader: Fetch user detail from back-api
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const userId = params.userId;

  if (!userId) {
    throw new Response("User ID is required", { status: 400 });
  }

  const apiUrl = process.env.API_URL || "http://back-api:8100";

  try {
    // TODO: Add Authorization header with admin JWT token
    const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
      headers: {
        // "Authorization": `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      throw new Response("User not found", { status: 404 });
    }

    if (!response.ok) {
      throw new Response("Failed to fetch user", { status: response.status });
    }

    const user = await response.json();

    return json<LoaderData>({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Action: Handle user update form submission
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = params.userId;

  if (!userId) {
    return json<ActionData>({ errors: { form: "User ID is required" } }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "update-user") {
    return json<ActionData>({ errors: { form: "Invalid form submission" } }, { status: 400 });
  }

  // Extract form fields
  const email = formData.get("email") as string;
  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const phone = formData.get("phone") as string;
  const company = formData.get("company") as string;
  const jobTitle = formData.get("job_title") as string;
  const department = formData.get("department") as string;
  const industry = formData.get("industry") as string;
  const language = formData.get("language") as string;
  const timezone = formData.get("timezone") as string;

  // Validate email
  if (!email || !email.includes("@")) {
    return json<ActionData>(
      { errors: { email: "Valid email is required" } },
      { status: 400 }
    );
  }

  // Build update payload
  const updatePayload: Record<string, any> = {
    email,
  };

  if (firstName) updatePayload.first_name = firstName;
  if (lastName) updatePayload.last_name = lastName;
  if (phone) updatePayload.phone = phone;
  if (company) updatePayload.company = company;
  if (jobTitle) updatePayload.job_title = jobTitle;
  if (department) updatePayload.department = department;
  if (industry) updatePayload.industry = industry;
  if (language) updatePayload.language = language;
  if (timezone) updatePayload.timezone = timezone;

  const apiUrl = process.env.API_URL || "http://back-api:8100";

  try {
    // TODO: Add Authorization header with admin JWT token
    const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updatePayload),
    });

    if (response.status === 400) {
      const errorData = await response.json();
      return json<ActionData>(
        { errors: { form: errorData.detail || "Invalid request" } },
        { status: 400 }
      );
    }

    if (!response.ok) {
      return json<ActionData>(
        { errors: { form: "Failed to update user" } },
        { status: response.status }
      );
    }

    // Success - redirect back to user list
    return redirect("/admin/features/user-management");
  } catch (error) {
    console.error("Error updating user:", error);
    return json<ActionData>(
      { errors: { form: "Network error. Please try again." } },
      { status: 500 }
    );
  }
}

export default function UserManagementEdit() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const statusFetcher = useFetcher();

  const isSubmitting = navigation.state === "submitting";
  const isTogglingStatus = statusFetcher.state !== "idle";
  const currentStatus = user.status || "active";
  const isActive = currentStatus === "active";

  const handleStatusToggle = async () => {
    const newStatus = isActive ? "inactive" : "active";
    const reason = isActive ? "Disabled by administrator" : "Enabled by administrator";

    statusFetcher.submit(
      {
        status: newStatus,
        reason: reason,
      },
      {
        method: "PATCH",
        action: `/admin/api/users/${user.id}/status`,
        encType: "application/json",
      }
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/features/user-management"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Back to User List
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Edit User</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update user information for {user.email}
        </p>
      </div>

      {/* User Status Toggle */}
      <div className="mb-6 bg-white shadow sm:rounded-lg border-l-4" style={{ borderLeftColor: isActive ? "#10b981" : "#ef4444" }}>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                User Status
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  This user is currently{" "}
                  <span className="font-semibold" style={{ color: isActive ? "#10b981" : "#ef4444" }}>
                    {isActive ? "ACTIVE" : "DISABLED"}
                  </span>
                  . {isActive ? "The user can log in and access the system." : "The user cannot log in or access the system."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={isTogglingStatus}
              className="inline-flex items-center rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: isTogglingStatus ? "#9ca3af" : (isActive ? "#ef4444" : "#10b981"),
                cursor: isTogglingStatus ? "not-allowed" : "pointer",
              }}
            >
              {isTogglingStatus ? "Processing..." : (isActive ? "Disable User" : "Enable User")}
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {actionData?.errors?.form && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error updating user
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {actionData.errors.form}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Info Card */}
      <div className="mb-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            User Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.is_email_verified ? "✓ Yes" : "✗ No"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Profile Completion
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.profile_completion_percentage}%
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Joined</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Login</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString()
                  : "Never"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Edit Form */}
      <UserForm
        user={user}
        errors={actionData?.errors}
        isSubmitting={isSubmitting}
        mode="edit"
      />
    </div>
  );
}
