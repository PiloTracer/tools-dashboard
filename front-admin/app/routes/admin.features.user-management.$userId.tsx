import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Link } from "@remix-run/react";
import { UserForm, type UserFormData } from "../features/user-management/ui/UserForm";

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

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    // TODO: Add Authorization header with admin JWT token
    const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
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

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    // TODO: Add Authorization header with admin JWT token
    const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
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

  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link
          to="/admin/features/user-management"
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#2563eb",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "12px"
          }}
        >
          ← Back to User List
        </Link>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "8px",
          letterSpacing: "-0.01em"
        }}>
          Edit User
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#6b7280"
        }}>
          Update user information for {user.email}
        </p>
      </div>

      {/* Error Message */}
      {actionData?.errors?.form && (
        <div style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          padding: "16px",
          marginBottom: "24px"
        }}>
          <h3 style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#991b1b",
            marginBottom: "4px"
          }}>
            Error updating user
          </h3>
          <p style={{
            fontSize: "14px",
            color: "#dc2626",
            margin: 0
          }}>
            {actionData.errors.form}
          </p>
        </div>
      )}

      {/* User Information Card */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h3 style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f3f4f6"
        }}>
          User Information
        </h3>
        <dl style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px"
        }}>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              User ID
            </dt>
            <dd style={{
              fontSize: "14px",
              color: "#111827",
              margin: 0
            }}>
              {user.id}
            </dd>
          </div>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              Role
            </dt>
            <dd style={{
              fontSize: "14px",
              color: "#111827",
              margin: 0,
              textTransform: "capitalize"
            }}>
              {user.role}
            </dd>
          </div>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              Email Status
            </dt>
            <dd style={{
              fontSize: "14px",
              margin: 0
            }}>
              {user.is_email_verified ? (
                <span style={{ color: "#059669", fontWeight: 500 }}>Verified</span>
              ) : (
                <span style={{ color: "#9ca3af" }}>Unverified</span>
              )}
            </dd>
          </div>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              Profile Completion
            </dt>
            <dd style={{
              fontSize: "14px",
              color: "#111827",
              margin: 0
            }}>
              {user.profile_completion_percentage}%
            </dd>
          </div>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              Joined
            </dt>
            <dd style={{
              fontSize: "14px",
              color: "#111827",
              margin: 0
            }}>
              {new Date(user.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#6b7280",
              marginBottom: "4px"
            }}>
              Last Login
            </dt>
            <dd style={{
              fontSize: "14px",
              color: "#111827",
              margin: 0
            }}>
              {user.last_login
                ? new Date(user.last_login).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
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
