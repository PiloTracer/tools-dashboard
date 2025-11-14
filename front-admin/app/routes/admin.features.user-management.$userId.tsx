import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Link } from "@remix-run/react";
import React from "react";
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
  // Contact information
  const mobilePhone = formData.get("mobile_phone") as string;
  const homePhone = formData.get("home_phone") as string;
  const workPhone = formData.get("work_phone") as string;
  // Address information
  const addressLine1 = formData.get("address_line1") as string;
  const addressLine2 = formData.get("address_line2") as string;
  const city = formData.get("city") as string;
  const stateProvince = formData.get("state_province") as string;
  const postalCode = formData.get("postal_code") as string;
  const country = formData.get("country") as string;
  // Professional information
  const company = formData.get("company") as string;
  const jobTitle = formData.get("job_title") as string;
  const department = formData.get("department") as string;
  const industry = formData.get("industry") as string;
  // Profile picture
  const pictureUrl = formData.get("picture_url") as string;
  // Other details
  const otherDetails = formData.get("other_details") as string;
  // Preferences
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
  if (mobilePhone) updatePayload.mobile_phone = mobilePhone;
  if (homePhone) updatePayload.home_phone = homePhone;
  if (workPhone) updatePayload.work_phone = workPhone;
  if (addressLine1) updatePayload.address_line1 = addressLine1;
  if (addressLine2) updatePayload.address_line2 = addressLine2;
  if (city) updatePayload.city = city;
  if (stateProvince) updatePayload.state_province = stateProvince;
  if (postalCode) updatePayload.postal_code = postalCode;
  if (country) updatePayload.country = country;
  if (company) updatePayload.company = company;
  if (jobTitle) updatePayload.job_title = jobTitle;
  if (department) updatePayload.department = department;
  if (industry) updatePayload.industry = industry;
  if (pictureUrl) updatePayload.picture_url = pictureUrl;
  if (otherDetails) updatePayload.other_details = otherDetails;
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
  const [isTogglingStatus, setIsTogglingStatus] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState((user as any).status || "active");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const isSubmitting = navigation.state === "submitting";
  const isActive = currentStatus === "active";

  // Check if editing own account (user.id === 1 is admin@example.com from mock auth)
  const isEditingOwnAccount = user.id === 1;

  const handleStatusToggle = async () => {
    const newStatus = isActive ? "inactive" : "active";
    const reason = isActive ? "Disabled by administrator" : "Enabled by administrator";

    setIsTogglingStatus(true);

    try {
      const response = await fetch(`/admin/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          reason: reason,
        }),
      });

      if (response.ok) {
        setCurrentStatus(newStatus);
      } else {
        const error = await response.json();
        console.error("Failed to update status:", error);
        alert("Failed to update user status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

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

      {/* User Status Toggle - Hidden when editing own account */}
      {!isEditingOwnAccount && (
        <div style={{
          marginBottom: "24px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
          borderRadius: "8px",
          borderLeft: `4px solid ${isActive ? "#10b981" : "#ef4444"}`
        }}>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  lineHeight: "24px",
                  color: "#111827"
                }}>
                  User Status
                </h3>
                <div style={{ marginTop: "8px", maxWidth: "36rem" }}>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>
                    This user is currently{" "}
                    <span style={{
                      fontWeight: 600,
                      color: isActive ? "#10b981" : "#ef4444"
                    }}>
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#ffffff",
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  border: "none",
                  backgroundColor: isTogglingStatus ? "#9ca3af" : (isActive ? "#ef4444" : "#10b981"),
                  cursor: isTogglingStatus ? "not-allowed" : "pointer",
                }}
              >
                {isTogglingStatus ? "Processing..." : (isActive ? "Disable User" : "Enable User")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Section */}
      <div style={{
        marginBottom: "24px",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        borderRadius: "8px",
        padding: "20px 24px"
      }}>
        <h3 style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "16px"
        }}>
          Change Password
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          <div>
            <label htmlFor="new_password" style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "6px"
            }}>
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 40px 8px 12px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  outline: "none"
                }}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#6b7280"
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm_password" style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "6px"
            }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 40px 8px 12px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  outline: "none"
                }}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#6b7280"
                }}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p style={{ marginTop: "8px", fontSize: "13px", color: "#ef4444" }}>
            Passwords do not match
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            if (!newPassword) {
              alert("Please enter a new password");
              return;
            }
            if (newPassword !== confirmPassword) {
              alert("Passwords do not match");
              return;
            }
            if (newPassword.length < 8) {
              alert("Password must be at least 8 characters");
              return;
            }

            try {
              const response = await fetch(`/admin/api/users/${user.id}/password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
              });

              if (response.ok) {
                setNewPassword("");
                setConfirmPassword("");
                alert("Password changed successfully");
              } else {
                const error = await response.json();
                alert(`Failed to change password: ${error.detail || "Unknown error"}`);
              }
            } catch (error) {
              alert("Network error. Please try again.");
            }
          }}
          disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#ffffff",
            backgroundColor: (!newPassword || !confirmPassword || newPassword !== confirmPassword) ? "#9ca3af" : "#2563eb",
            border: "none",
            borderRadius: "6px",
            cursor: (!newPassword || !confirmPassword || newPassword !== confirmPassword) ? "not-allowed" : "pointer"
          }}
        >
          Change Password
        </button>
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
