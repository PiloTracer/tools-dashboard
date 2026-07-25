import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { z } from "zod";

import { usePublicHref } from "../../../components/layout/PublicLayout";
import i18next from "../../../i18next.server";
import { VerificationBanner } from "../ui/VerificationBanner";
import { getBackAuthEnv } from "../../../utils/env.server";
import { resolveRedirectTarget } from "../../../utils/publicPath.server";

const verificationQuerySchema = z
  .object({
    provider: z.enum(["google"]).optional(),
    code: z.string().optional(),
    state: z.string().optional(),
    token: z.string().optional(),
    email: z.string().email().optional(),
    source: z.string().optional(),
  })
  .passthrough();

const verificationStatusSchema = z
  .object({
    status: z.enum(["pending", "verified"]),
    message: z.string().optional(),
    email: z.string().email().optional(),
    redirectTo: z.string().optional(),
  })
  .passthrough();

const apiErrorSchema = z
  .object({
    message: z.string().optional(),
  })
  .passthrough();

type LoaderData = {
  status: "pending" | "verified" | "error";
  message: string;
  supportUrl?: string;
  email?: string;
  flow?: "email" | "google";
};

const SUPPORT_MAILTO = "mailto:support@tools-dashboard.io";

function defaultPendingMessage(t: TFunction, email?: string) {
  return email ? t("verify.messages.pendingWithEmail", { email }) : t("verify.messages.pendingGeneric");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const url = new URL(request.url);
  const parsedQuery = verificationQuerySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsedQuery.success) {
    throw new Response("Invalid verification parameters", { status: 400 });
  }

  const { provider, code, state, token, email: queryEmail } = parsedQuery.data;

  const { backAuthBaseUrl } = getBackAuthEnv();
  const cookieHeader = request.headers.get("cookie");

  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (cookieHeader) {
    baseHeaders.Cookie = cookieHeader;
  }

  let email = queryEmail;
  const supportUrl: string | undefined = SUPPORT_MAILTO;

  const isGoogleOAuthReturn = !token && (provider === "google" || (Boolean(code) && Boolean(state)));

  if (isGoogleOAuthReturn) {
    if (!code || !state) {
      return json<LoaderData>(
        {
          status: "error",
          flow: "google",
          message: t("verify.messages.googleMissingParams"),
          supportUrl: SUPPORT_MAILTO,
          email,
        },
        { status: 400 },
      );
    }

    const callbackUrl = new URL("/user-registration/providers/google/callback", backAuthBaseUrl);
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, state }),
    }).catch((error) => {
      console.error("Google callback request failed", error);
      return null;
    });

    if (!response) {
      return json<LoaderData>(
        {
          status: "error",
          flow: "google",
          message: t("verify.messages.googleServiceUnreachable"),
          supportUrl: SUPPORT_MAILTO,
          email,
        },
        { status: 502 },
      );
    }

    const setCookieHeaders = getAllSetCookieHeaders(response);

    if (response.ok) {
      const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));

      if (!parsed.success) {
        console.error("Unexpected Google verification payload", parsed.error);
        return json<LoaderData>(
          {
            status: "error",
            flow: "google",
            message: t("verify.messages.googleUnexpectedPayload"),
            supportUrl: SUPPORT_MAILTO,
            email,
          },
          { status: 502 },
        );
      }

      email = parsed.data.email ?? email;

      const resolvedRedirect = resolveRedirectTarget(parsed.data.redirectTo);
      if (resolvedRedirect) {
        const redirectResponse = redirect(resolvedRedirect);
        for (const cookie of setCookieHeaders) {
          redirectResponse.headers.append("Set-Cookie", cookie);
        }
        return redirectResponse;
      }

      const successResponse = json<LoaderData>({
        flow: "google",
        status: parsed.data.status === "verified" ? "verified" : "pending",
        message:
          parsed.data.message ??
          (parsed.data.status === "verified"
            ? t("verify.messages.googleVerified")
            : t("verify.messages.googlePending")),
        supportUrl,
        email,
      });

      for (const cookie of setCookieHeaders) {
        successResponse.headers.append("Set-Cookie", cookie);
      }
      return successResponse;
    }

    const parsedError = apiErrorSchema.safeParse(await safeReadJson(response));
    return json<LoaderData>(
      {
        flow: "google",
        status: "error",
        message:
          parsedError.success && parsedError.data.message
            ? parsedError.data.message
            : t("verify.messages.googleFailed"),
        supportUrl: SUPPORT_MAILTO,
        email,
      },
      { status: response.status === 400 ? 400 : 502 },
    );
  }

  if (token) {
    const verifyUrl = new URL("/user-registration/verify-email", backAuthBaseUrl);
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    }).catch((error) => {
      console.error("Email verification request failed", error);
      return null;
    });

    if (!response) {
      return json<LoaderData>(
        {
          status: "error",
          message: t("verify.messages.emailServiceUnreachable"),
          supportUrl: SUPPORT_MAILTO,
          email,
        },
        { status: 502 },
      );
    }

    const emailSetCookieHeaders = getAllSetCookieHeaders(response);

    if (response.ok) {
      const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));
      if (!parsed.success) {
        console.error("Unexpected email verification payload", parsed.error);
        return json<LoaderData>(
          {
            status: "error",
            message: t("verify.messages.emailInvalidLink"),
            supportUrl: SUPPORT_MAILTO,
            email,
          },
          { status: 400 },
        );
      }

      email = parsed.data.email ?? email;

      const resolvedRedirect = resolveRedirectTarget(parsed.data.redirectTo);
      if (resolvedRedirect) {
        const redirectResponse = redirect(resolvedRedirect);
        for (const cookie of emailSetCookieHeaders) {
          redirectResponse.headers.append("Set-Cookie", cookie);
        }
        return redirectResponse;
      }

      const successResponse = json<LoaderData>({
        status: parsed.data.status === "verified" ? "verified" : "pending",
        message:
          parsed.data.message ??
          (parsed.data.status === "verified"
            ? t("verify.messages.emailVerified")
            : t("verify.messages.emailPending")),
        supportUrl,
        email,
      });

      for (const cookie of emailSetCookieHeaders) {
        successResponse.headers.append("Set-Cookie", cookie);
      }
      return successResponse;
    }

    const parsedError = apiErrorSchema.safeParse(await safeReadJson(response));
    return json<LoaderData>(
      {
        status: "error",
        message:
          parsedError.success && parsedError.data.message
            ? parsedError.data.message
            : t("verify.messages.emailInvalidLink"),
        supportUrl: SUPPORT_MAILTO,
        email,
      },
      { status: response.status === 400 ? 400 : 502 },
    );
  }

  const statusUrl = new URL("/user-registration/status", backAuthBaseUrl);
  const response = await fetch(statusUrl, {
    headers: baseHeaders,
  }).catch((error) => {
    console.error("Status check failed", error);
    return null;
  });

  if (!response) {
    return json<LoaderData>(
      {
        status: "pending",
        message: defaultPendingMessage(t, email),
        supportUrl: SUPPORT_MAILTO,
        email,
      },
      { status: 200 },
    );
  }

  const statusSetCookieHeaders = getAllSetCookieHeaders(response);

  if (response.ok) {
    const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));

    if (parsed.success) {
      email = parsed.data.email ?? email;

      const resolvedRedirect = resolveRedirectTarget(parsed.data.redirectTo);
      if (resolvedRedirect && parsed.data.status === "verified") {
        const redirectResponse = redirect(resolvedRedirect);
        for (const cookie of statusSetCookieHeaders) {
          redirectResponse.headers.append("Set-Cookie", cookie);
        }
        return redirectResponse;
      }

      const successResponse = json<LoaderData>({
        status: parsed.data.status === "verified" ? "verified" : "pending",
        message:
          parsed.data.message ??
          (parsed.data.status === "verified"
            ? t("verify.messages.accountVerified")
            : defaultPendingMessage(t, email)),
        supportUrl,
        email,
      });

      for (const cookie of statusSetCookieHeaders) {
        successResponse.headers.append("Set-Cookie", cookie);
      }
      return successResponse;
    }
  }

  const parsedError = apiErrorSchema.safeParse(await safeReadJson(response));

  const responsePayload: LoaderData = {
    status: "pending",
    message:
      parsedError.success && parsedError.data.message
        ? parsedError.data.message
        : defaultPendingMessage(t, email),
    supportUrl: SUPPORT_MAILTO,
    email,
  };

  const statusResponse = json<LoaderData>(responsePayload);
  for (const cookie of statusSetCookieHeaders) {
    statusResponse.headers.append("Set-Cookie", cookie);
  }
  return statusResponse;
}

export default function VerifyRoute() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const continueHref = usePublicHref("/features/app-library");
  const isGoogleFlow = data.flow === "google";

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="space-y-3 text-center">
        {isGoogleFlow ? (
          <>
            <h1 className="text-3xl font-semibold text-slate-900">{t("verify.google.title")}</h1>
            <p className="text-base text-slate-600">
              {data.status === "error"
                ? t("verify.google.subtitle.error")
                : data.status === "verified"
                  ? t("verify.google.subtitle.verified")
                  : t("verify.google.subtitle.pending")}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-slate-900">{t("verify.title")}</h1>
            <p className="text-base text-slate-600">
              {data.email ? (
                <Trans
                  i18nKey="verify.email.sentTo"
                  values={{ email: data.email }}
                  components={{ strong: <strong className="font-semibold text-slate-900" /> }}
                />
              ) : (
                t("verify.email.sentGeneric")
              )}
            </p>
          </>
        )}
      </header>

      <VerificationBanner status={data.status} message={data.message} supportUrl={data.supportUrl} />

      {!isGoogleFlow ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-left text-sm text-slate-600 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("verify.help.title")}</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("verify.help.spam")}</li>
            <li>{t("verify.help.expiry")}</li>
            <li>
              <Trans
                i18nKey="verify.help.contactSupport"
                components={{
                  1: (
                    <a href={SUPPORT_MAILTO} className="font-semibold text-blue-600 underline">
                      {t("common.contactSupport")}
                    </a>
                  ),
                }}
              />
            </li>
          </ul>
        </div>
      ) : null}

      {data.status === "verified" ? (
        <div className="flex justify-center">
          <Link
            to={continueHref}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {t("verify.continueOnboarding")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function getAllSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const rawHeaders = (response.headers as { raw?: () => Record<string, string[]> }).raw?.();
  if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
    return rawHeaders["set-cookie"];
  }

  const singleHeader = response.headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}
