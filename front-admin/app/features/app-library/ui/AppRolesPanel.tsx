import type { FC } from "react";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccessUserOption } from "./AccessControlPanel";

export type AppRoleHolder = {
  user_id: number;
  email: string;
  role: string;
  app_id: string | null;
  granted_by: number | null;
  created_at: string | null;
};

type Props = {
  appId: string;
  holders: AppRoleHolder[];
  loadError?: string;
};

function formatGrantedAt(t: (key: string, options?: Record<string, unknown>) => string, iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return t("appLibrary.roles.grantedAt", {
    date: date.toLocaleDateString(),
  });
}

export const AppRolesPanel: FC<Props> = ({ appId, holders, loadError }) => {
  const { t } = useTranslation();
  const revalidator = useRevalidator();
  const searchFetcher = useFetcher<{
    users: AccessUserOption[];
    total: number;
    error?: string;
  }>();

  const [userSearch, setUserSearch] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isBusy = pendingKey !== null;

  const trimmedSearch = userSearch.trim();
  const isServerSearch = trimmedSearch.length >= 2;

  useEffect(() => {
    if (!isServerSearch) return;
    const handle = window.setTimeout(() => {
      searchFetcher.load(
        `/admin/api/users/search?q=${encodeURIComponent(trimmedSearch)}&page_size=100`
      );
    }, 300);
    return () => window.clearTimeout(handle);
  }, [trimmedSearch, isServerSearch]);

  const appsuperIds = useMemo(
    () =>
      new Set(
        holders
          .filter((holder) => holder.role === "appsuper")
          .map((holder) => holder.user_id)
      ),
    [holders]
  );

  const searchResults = useMemo(() => {
    if (!isServerSearch || !searchFetcher.data?.users) return [];
    return searchFetcher.data.users;
  }, [isServerSearch, searchFetcher.data?.users]);

  const mutateRole = async (
    method: "PUT" | "DELETE",
    userId: number,
    key: string
  ) => {
    if (isBusy) return;
    setPendingKey(key);
    setActionError(null);
    try {
      const response = await fetch(`/admin/api/app-library/${appId}/roles`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: "appsuper" }),
      });
      if (response.ok) {
        if (method === "PUT") setUserSearch("");
        revalidator.revalidate();
      } else {
        const error = (await response.json().catch(() => ({}))) as {
          detail?: unknown;
        };
        setActionError(
          typeof error.detail === "string"
            ? error.detail
            : t("appLibrary.roles.actionFailed")
        );
      }
    } catch {
      setActionError(t("appLibrary.roles.networkError"));
    } finally {
      setPendingKey(null);
    }
  };

  const sortedHolders = useMemo(
    () =>
      [...holders].sort((a, b) => {
        if (a.role !== b.role) return a.role === "appglobal" ? -1 : 1;
        return a.email.localeCompare(b.email);
      }),
    [holders]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        {t("appLibrary.roles.title")}
      </h3>
      <p className="mb-6 text-sm text-slate-600">
        {t("appLibrary.roles.description")}
      </p>

      {loadError && (
        <div
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {actionError && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {actionError}
        </div>
      )}

      <fieldset disabled={isBusy} className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("appLibrary.roles.holdersTitle")}
          </h4>
          {sortedHolders.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
              {t("appLibrary.roles.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {sortedHolders.map((holder) => {
                const isGlobal =
                  holder.role === "appglobal" || holder.app_id === null;
                const rowKey = `revoke:${holder.user_id}`;
                const grantedAt = formatGrantedAt(t, holder.created_at);
                return (
                  <li
                    key={`${holder.role}:${holder.user_id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {holder.email}
                      </span>
                      <span className="block text-xs text-slate-500">
                        ID {holder.user_id}
                        {grantedAt ? ` · ${grantedAt}` : ""}
                      </span>
                    </div>
                    {isGlobal ? (
                      <>
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                          {t("appLibrary.roles.appglobalBadge")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {t("appLibrary.roles.appglobalManaged")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                          appsuper
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            mutateRole("DELETE", holder.user_id, rowKey)
                          }
                          disabled={isBusy}
                          aria-busy={pendingKey === rowKey}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingKey === rowKey
                            ? t("appLibrary.roles.revoking")
                            : t("appLibrary.roles.revoke")}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              {t("appLibrary.roles.grantTitle")}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {t("appLibrary.roles.grantHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="appsuper_user_search"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {t("appLibrary.roles.userSearchLabel")}
            </label>
            <input
              id="appsuper_user_search"
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder={t("appLibrary.roles.userSearchPlaceholder")}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {isServerSearch && searchFetcher.state === "loading" && (
              <p className="mt-1 text-xs text-slate-500">
                {t("appLibrary.roles.searching")}
              </p>
            )}
          </div>

          {isServerSearch && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {searchResults.length === 0 &&
              searchFetcher.state !== "loading" ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  {t("appLibrary.roles.noUsersMatch")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {searchResults.map((user) => {
                    const alreadyHolder = appsuperIds.has(user.id);
                    const grantKey = `grant:${user.id}`;
                    return (
                      <li
                        key={user.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {user.email}
                          </span>
                          <span className="block text-xs text-slate-500">
                            ID {user.id}
                          </span>
                        </div>
                        {alreadyHolder ? (
                          <span className="text-xs font-medium text-slate-400">
                            {t("appLibrary.roles.alreadyHolder")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              mutateRole("PUT", user.id, grantKey)
                            }
                            disabled={isBusy}
                            aria-busy={pendingKey === grantKey}
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === grantKey
                              ? t("appLibrary.roles.granting")
                              : t("appLibrary.roles.grant")}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
};
