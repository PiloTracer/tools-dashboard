import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getAdminSession } from "../utils/admin-session.server";
import { bearerHeaders } from "../utils/admin-api-auth.server";
import type { AccessUserOption } from "../features/app-library/ui/AccessControlPanel";

type LoaderData = {
  users: AccessUserOption[];
  total: number;
  error?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() || "";
  const pageSize = Math.min(
    Number.parseInt(url.searchParams.get("page_size") || "50", 10) || 50,
    100
  );

  const { accessToken } = await getAdminSession(request);
  const apiUrl = process.env.API_URL || "http://back-api:8000";
  const auth = bearerHeaders(accessToken);

  if (!auth.Authorization) {
    return json<LoaderData>(
      { users: [], total: 0, error: "Not signed in" },
      { status: 401 }
    );
  }

  const params = new URLSearchParams({
    page_size: String(pageSize),
    sort_by: "email",
    sort_order: "asc",
  });
  if (search) {
    params.set("search", search);
  }

  try {
    const response = await fetch(`${apiUrl}/admin/users?${params}`, {
      headers: { ...auth },
    });

    if (!response.ok) {
      return json<LoaderData>(
        {
          users: [],
          total: 0,
          error: `Could not search users (HTTP ${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      users?: AccessUserOption[];
      total?: number;
    };

    return json<LoaderData>({
      users: data.users ?? [],
      total: data.total ?? 0,
    });
  } catch {
    return json<LoaderData>(
      { users: [], total: 0, error: "Network error while searching users" },
      { status: 500 }
    );
  }
}
