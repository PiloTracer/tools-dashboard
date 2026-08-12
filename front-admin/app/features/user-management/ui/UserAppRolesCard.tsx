import type { FC } from "react";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type UserAppRoleAssignment = {
  id: string;
  user_id: number;
  role: string;
  scope: string; // "per_app" | "all_apps"
  app_id: string | null;
  app_client_id: string | null;
  app_name: string | null;
  granted_by: number | null;
  created_at: string | null;
};

type AppOption = {
  id: string;
  client_id: string;
  client_name: string;
};

type Props = {
  userId: number;
  assignments: UserAppRoleAssignment[];
  loadError?: string;
};

export const UserAppRolesCard: FC<Props> = ({
  userId,
  assignments,
  loadError,
}) => {
  const { t } = useTranslation();
  const revalidator = useRevalidator();
  const appsFetcher = useFetcher<{ apps?: AppOption[]; detail?: string }>();

  const [selectedAppId, setSelectedAppId] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isBusy = pendingKey !== null;

  useEffect(() => {
    if (appsFetcher.state === "idle" && !appsFetcher.data) {
      appsFetcher.load("/admin/api/app-library");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apps = useMemo(() => appsFetcher.data?.apps ?? [], [appsFetcher.data]);
  const appsError =
    appsFetcher.data && !Array.isArray(appsFetcher.data.apps)
      ? t("userManagement.edit.appRolesAppsLoadError")
      : undefined;

  const hasAppglobal = assignments.some((a) => a.role === "appglobal");
  const appsuperAppIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((a) => a.role === "appsuper" && a.app_id)
          .map((a) => a.app_id as string)
      ),
    [assignments]
  );

  const mutate = async (
    key: string,
    url: string,
    method: "PUT" | "DELETE",
    body: Record<string, unknown>
  ): Promise<boolean> => {
    if (isBusy) return false;
    setPendingKey(key);
    setActionError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        revalidator.revalidate();
        return true;
      }
      const error = (await response.json().catch(() => ({}))) as {
        detail?: unknown;
      };
      setActionError(
        typeof error.detail === "string"
          ? error.detail
          : t("userManagement.edit.appRolesFailed")
      );
      return false;
    } catch {
      setActionError(t("userManagement.edit.appRolesNetworkError"));
      return false;
    } finally {
      setPendingKey(null);
    }
  };

  const grantAppsuper = () => {
    if (!selectedAppId) return;
    void mutate(
      "grant:appsuper",
      `/admin/api/app-library/${selectedAppId}/roles`,
      "PUT",
      { user_id: userId, role: "appsuper" }
    ).then((ok) => {
      if (ok) setSelectedAppId("");
    });
  };

  const revokeAppsuper = (appId: string) => {
    void mutate(
      `revoke:appsuper:${appId}`,
      `/admin/api/app-library/${appId}/roles`,
      "DELETE",
      { user_id: userId, role: "appsuper" }
    );
  };

  const grantAppglobal = () => {
    if (!window.confirm(t("userManagement.edit.appRolesGrantGlobalConfirm"))) {
      return;
    }
    void mutate("grant:appglobal", `/admin/api/users/${userId}/app-roles`, "PUT", {
      role: "appglobal",
    });
  };

  const revokeAppglobal = () => {
    void mutate(
      "revoke:appglobal",
      `/admin/api/users/${userId}/app-roles`,
      "DELETE",
      { role: "appglobal" }
    );
  };

  const formatSince = (iso: string | null): string => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return t("userManagement.edit.appRolesSince", {
      date: date.toLocaleDateString(),
    });
  };

  const busyButtonColor = "#9ca3af";

  return (
    <div
      style={{
        marginBottom: "24px",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        borderRadius: "8px",
        borderLeft: "4px solid #7c3aed",
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "24px",
            color: "#111827",
          }}
        >
          {t("userManagement.edit.appRolesCardTitle")}
        </h3>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "8px 0 0" }}>
          {t("userManagement.edit.appRolesCardBody")}
        </p>

        {loadError ? (
          <p
            style={{
              fontSize: "13px",
              color: "#b45309",
              margin: "12px 0 0",
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              padding: "10px 12px",
            }}
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {actionError ? (
          <p
            style={{ fontSize: "13px", color: "#dc2626", margin: "12px 0 0" }}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}

        <fieldset
          disabled={isBusy}
          style={{ border: "none", margin: "16px 0 0", padding: 0 }}
        >
          {/* Current assignments */}
          {assignments.length === 0 ? (
            <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
              {t("userManagement.edit.appRolesEmpty")}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                borderTop: "1px solid #f3f4f6",
              }}
            >
              {assignments.map((assignment) => {
                const isGlobal = assignment.role === "appglobal";
                const rowKey = isGlobal
                  ? "revoke:appglobal"
                  : `revoke:appsuper:${assignment.app_id}`;
                const since = formatSince(assignment.created_at);
                return (
                  <li
                    key={`${assignment.role}:${assignment.app_id ?? "global"}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      padding: "10px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 16rem" }}>
                      {isGlobal ? (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6d28d9",
                            backgroundColor: "#ede9fe",
                            borderRadius: "9999px",
                            padding: "2px 10px",
                          }}
                        >
                          {t("userManagement.edit.appRolesGlobalBadge")}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#4338ca",
                            backgroundColor: "#e0e7ff",
                            borderRadius: "9999px",
                            padding: "2px 10px",
                          }}
                        >
                          <strong>appsuper</strong>
                          {" — "}
                          {assignment.app_name ||
                            assignment.app_client_id ||
                            assignment.app_id}
                        </span>
                      )}
                      {since ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#9ca3af",
                            marginTop: "4px",
                          }}
                        >
                          {since}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        isGlobal
                          ? revokeAppglobal()
                          : assignment.app_id
                            ? revokeAppsuper(assignment.app_id)
                            : undefined
                      }
                      disabled={isBusy || (!isGlobal && !assignment.app_id)}
                      aria-busy={pendingKey === rowKey}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#b91c1c",
                        backgroundColor: "#ffffff",
                        border: "1px solid #fecaca",
                        cursor: isBusy ? "not-allowed" : "pointer",
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      {pendingKey === rowKey
                        ? t("userManagement.edit.appRolesRevoking")
                        : t("userManagement.edit.appRolesRevoke")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Grant appsuper — this app… */}
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111827",
                margin: 0,
              }}
            >
              {t("userManagement.edit.appRolesGrantSuperTitle")}
            </h4>
            <p
              style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}
            >
              {t("userManagement.edit.appRolesGrantSuperHelp")}
            </p>
            {appsError ? (
              <p
                style={{ fontSize: "13px", color: "#b45309", margin: "8px 0 0" }}
                role="alert"
              >
                {appsError}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <div>
                <label
                  htmlFor="appsuper-app-select"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  {t("userManagement.edit.appRolesAppPickerLabel")}
                </label>
                <select
                  id="appsuper-app-select"
                  value={selectedAppId}
                  onChange={(event) => setSelectedAppId(event.target.value)}
                  disabled={isBusy || appsFetcher.state === "loading"}
                  style={{
                    minWidth: "220px",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="">
                    {t("userManagement.edit.appRolesAppPickerPlaceholder")}
                  </option>
                  {apps.map((app) => (
                    <option
                      key={app.id}
                      value={app.id}
                      disabled={appsuperAppIds.has(app.id)}
                    >
                      {app.client_name} ({app.client_id})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={grantAppsuper}
                disabled={isBusy || !selectedAppId}
                aria-busy={pendingKey === "grant:appsuper"}
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
                  backgroundColor:
                    isBusy || !selectedAppId ? busyButtonColor : "#4f46e5",
                  cursor:
                    isBusy || !selectedAppId ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {pendingKey === "grant:appsuper"
                  ? t("userManagement.edit.appRolesGranting")
                  : t("userManagement.edit.appRolesGrantSuper")}
              </button>
            </div>
          </div>

          {/* Grant appglobal — all apps, present and future */}
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: "8px",
            }}
          >
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111827",
                margin: 0,
              }}
            >
              {t("userManagement.edit.appRolesGrantGlobalTitle")}
            </h4>
            <p
              style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}
            >
              {t("userManagement.edit.appRolesGrantGlobalHelp")}
            </p>
            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                onClick={grantAppglobal}
                disabled={isBusy || hasAppglobal}
                aria-busy={pendingKey === "grant:appglobal"}
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
                  backgroundColor:
                    isBusy || hasAppglobal ? busyButtonColor : "#7c3aed",
                  cursor:
                    isBusy || hasAppglobal ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {pendingKey === "grant:appglobal"
                  ? t("userManagement.edit.appRolesGranting")
                  : t("userManagement.edit.appRolesGrantGlobal")}
              </button>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
};
