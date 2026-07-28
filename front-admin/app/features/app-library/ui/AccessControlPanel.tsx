import type { FC } from "react";
import { Form, useFetcher, useNavigation } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type AccessMode =
  | "all_users"
  | "all_except"
  | "only_specified"
  | "subscription_based";

export type AccessRuleState = {
  mode: AccessMode;
  user_ids: number[];
  subscription_tiers: string[];
};

export type AccessUserOption = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

const ACCESS_MODES: AccessMode[] = [
  "all_users",
  "all_except",
  "only_specified",
  "subscription_based",
];

const SUBSCRIPTION_TIERS = ["free", "pro", "enterprise", "custom"] as const;

type Props = {
  accessRule: AccessRuleState | null;
  users: AccessUserOption[];
  usersTotal: number;
  usersLoadError?: string;
  formAction: string;
  fieldErrors?: Record<string, string>;
  actionError?: string;
  saved?: boolean;
};

function displayName(user: AccessUserOption): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email;
}

function parseManualUserIds(raw: string): number[] {
  return raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => Number.parseInt(part, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function accessRuleSyncKey(rule: AccessRuleState | null): string {
  if (!rule) return "none";
  return `${rule.mode}:${rule.user_ids.join(",")}:${rule.subscription_tiers.join(",")}`;
}

export const AccessControlPanel: FC<Props> = ({
  accessRule,
  users,
  usersTotal,
  usersLoadError,
  formAction,
  fieldErrors,
  actionError,
  saved,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const searchFetcher = useFetcher<{
    users: AccessUserOption[];
    total: number;
    error?: string;
  }>();

  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "update_access";

  const ruleKey = accessRuleSyncKey(accessRule);

  const [mode, setMode] = useState<AccessMode>(accessRule?.mode ?? "all_users");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(
    accessRule?.user_ids ?? []
  );
  const [selectedTiers, setSelectedTiers] = useState<string[]>(
    accessRule?.subscription_tiers ?? []
  );
  const [userSearch, setUserSearch] = useState("");
  const [manualUserIds, setManualUserIds] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setMode(accessRule?.mode ?? "all_users");
    setSelectedUserIds(accessRule?.user_ids ?? []);
    setSelectedTiers(accessRule?.subscription_tiers ?? []);
    setManualUserIds("");
    setUserSearch("");
    setIsDirty(false);
  }, [ruleKey]);

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

  const needsUserIds = mode === "only_specified" || mode === "all_except";
  const needsTiers = mode === "subscription_based";

  const manualIdList = useMemo(
    () => parseManualUserIds(manualUserIds),
    [manualUserIds]
  );

  const selectedCount = useMemo(() => {
    return new Set([...selectedUserIds, ...manualIdList]).size;
  }, [selectedUserIds, manualIdList]);

  const userIdsJson = useMemo(() => {
    const merged = Array.from(
      new Set([...selectedUserIds, ...manualIdList])
    );
    merged.sort((a, b) => a - b);
    return JSON.stringify(merged);
  }, [selectedUserIds, manualIdList]);

  const tiersJson = useMemo(
    () => JSON.stringify(selectedTiers),
    [selectedTiers]
  );

  const listUsers = useMemo(() => {
    if (isServerSearch && searchFetcher.data?.users) {
      return searchFetcher.data.users;
    }
    const q = trimmedSearch.toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = [
        user.email,
        user.first_name ?? "",
        user.last_name ?? "",
        String(user.id),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [isServerSearch, searchFetcher.data?.users, trimmedSearch, users]);

  const listTotal = isServerSearch
    ? (searchFetcher.data?.total ?? listUsers.length)
    : usersTotal;

  const listError =
    usersLoadError ||
    (isServerSearch ? searchFetcher.data?.error : undefined);

  const translateFieldError = (key: string | undefined) => {
    if (!key) return undefined;
    return key.startsWith("appLibrary.") ? t(key) : key;
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId].sort((a, b) => a - b)
    );
    setIsDirty(true);
  };

  const toggleTier = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
    setIsDirty(true);
  };

  const showSaved = saved && !isDirty;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        {t("appLibrary.access.title")}
      </h3>
      <p className="mb-6 text-sm text-slate-600">
        {t("appLibrary.access.description")}
      </p>

      {showSaved && (
        <div
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {t("appLibrary.access.saved")}
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

      <Form method="post" action={formAction}>
        <input type="hidden" name="_action" value="update_access" />
        <input type="hidden" name="user_ids_json" value={userIdsJson} />
        <input type="hidden" name="subscription_tiers_json" value={tiersJson} />

        <fieldset disabled={isSubmitting} className="space-y-6">
          <div>
            <label
              htmlFor="access_mode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {t("appLibrary.access.modeLabel")}
            </label>
            <select
              id="access_mode"
              name="access_mode"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as AccessMode);
                setIsDirty(true);
              }}
              className="block w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ACCESS_MODES.map((option) => (
                <option key={option} value={option}>
                  {t(`appLibrary.access.modes.${option}`)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {t(`appLibrary.access.modeHelp.${mode}`)}
            </p>
            {fieldErrors?.access_mode && (
              <p className="mt-1 text-sm text-red-600">
                {translateFieldError(fieldErrors.access_mode)}
              </p>
            )}
          </div>

          {needsUserIds && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              {listError && (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  role="alert"
                >
                  {listError}
                </div>
              )}

              <div>
                <label
                  htmlFor="user_search"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("appLibrary.access.userSearchLabel")}
                </label>
                <input
                  id="user_search"
                  type="search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder={t("appLibrary.access.userSearchPlaceholder")}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("appLibrary.access.userListHint", {
                    shown: listUsers.length,
                    total: listTotal,
                    selected: selectedCount,
                  })}
                </p>
                {isServerSearch && searchFetcher.state === "loading" && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("appLibrary.access.searching")}
                  </p>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {listUsers.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    {t("appLibrary.access.noUsersMatch")}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {listUsers.map((user) => {
                      const checked = selectedUserIds.includes(user.id);
                      return (
                        <li key={user.id}>
                          <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(user.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-900">
                                {displayName(user)}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {user.email} · ID {user.id}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="manual_user_ids"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("appLibrary.access.manualIdsLabel")}
                </label>
                <input
                  id="manual_user_ids"
                  type="text"
                  value={manualUserIds}
                  onChange={(event) => {
                    setManualUserIds(event.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={t("appLibrary.access.manualIdsPlaceholder")}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("appLibrary.access.manualIdsHelp")}
                </p>
              </div>

              {fieldErrors?.user_ids && (
                <p className="text-sm text-red-600">
                  {translateFieldError(fieldErrors.user_ids)}
                </p>
              )}
            </div>
          )}

          {needsTiers && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="note"
              >
                {t("appLibrary.access.tiersWarning")}
              </div>
              <p className="text-sm font-medium text-slate-700">
                {t("appLibrary.access.tiersLabel")}
              </p>
              <p className="text-xs text-slate-500">
                {t("appLibrary.access.tiersHelp")}
              </p>
              <div className="flex flex-wrap gap-3">
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <label
                    key={tier}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTiers.includes(tier)}
                      onChange={() => toggleTier(tier)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {t(`appLibrary.access.tiers.${tier}`)}
                  </label>
                ))}
              </div>
              {fieldErrors?.subscription_tiers && (
                <p className="text-sm text-red-600">
                  {translateFieldError(fieldErrors.subscription_tiers)}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t("appLibrary.access.saving")
                : t("appLibrary.access.save")}
            </button>
          </div>
        </fieldset>
      </Form>
    </div>
  );
};
