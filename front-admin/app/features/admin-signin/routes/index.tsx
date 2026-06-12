import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { isValidAdminCsrf, newAdminCsrf } from "../../../utils/admin-csrf.server";
import { getAdminSession, commitAdminSession } from "../../../utils/admin-session.server";
import { AdminSigninForm } from "../ui/AdminSigninForm";

type ActionData = {
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  formError?: string;
};

/**
 * Loader: Check if user is already authenticated
 * If authenticated as admin, redirect to dashboard
 * If authenticated but not admin, clear session and show form
 * If not authenticated, show form
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is already authenticated via signed session
  const { accessToken } = await getAdminSession(request);
  if (accessToken) {
    return redirect("/admin/");
  }

  const { token, setCookie } = newAdminCsrf(request);
  return json(
    { csrfToken: token },
    { headers: { "Set-Cookie": setCookie } }
  );
}

/**
 * Action: Handle admin signin form submission
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const intent = formData.get("intent");

  if (!isValidAdminCsrf(request, formData)) {
    return json<ActionData>(
      { formError: "Invalid or expired security token. Refresh the page and try again." },
      { status: 403 }
    );
  }

  // Validate intent
  if (intent !== "admin-signin") {
    return json<ActionData>(
      { formError: "Invalid form submission" },
      { status: 400 }
    );
  }

  // Validate fields
  const fieldErrors: ActionData["fieldErrors"] = {};

  if (typeof email !== "string" || !email) {
    fieldErrors.email = "Email is required";
  } else if (!email.includes("@")) {
    fieldErrors.email = "Please enter a valid email address";
  }

  if (typeof password !== "string" || !password) {
    fieldErrors.password = "Password is required";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Call back-auth login endpoint
  const authApiUrl = process.env.AUTH_API_URL || "http://back-auth:8001";

  try {
    const response = await fetch(`${authApiUrl}/email/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error cases
      if (response.status === 401) {
        return json<ActionData>(
          { formError: "Invalid email or password" },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return json<ActionData>(
          { formError: errorData.detail || "Email not verified. Please verify your email before logging in." },
          { status: 403 }
        );
      }

      return json<ActionData>(
        { formError: "An error occurred. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();

    // CRITICAL: Verify user has admin role
    if (data.user?.role !== "admin") {
      return json<ActionData>(
        { formError: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    // Store tokens in signed Remix session
    const sessionCookie = await commitAdminSession(
      request,
      data.access_token,
      data.user?.email || "",
    );

    // Redirect to admin dashboard
    return redirect("/admin/", {
      headers: {
        "Set-Cookie": sessionCookie,
      },
    });
  } catch (error) {
    console.error("Admin signin error:", error);
    return json<ActionData>(
      { formError: "Failed to connect to authentication service. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Component: Admin signin page
 */
export default function AdminSigninIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(79,70,229,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-16 sm:px-8 lg:px-12">
        <div className="w-full max-w-md sm:max-w-lg">
          <AdminSigninForm
            csrfToken={loaderData.csrfToken}
            fieldErrors={actionData?.fieldErrors}
            formError={actionData?.formError}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
