import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { usePublicHref } from "../../../components/layout/PublicLayout";
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
};

const SUPPORT_MAILTO = "mailto:support@tools-dashboard.io";

export async function loader({ request }: LoaderFunctionArgs) {
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
  let supportUrl: string | undefined = SUPPORT_MAILTO;

  if (provider === "google") {
    if (!code || !state) {
      return json<LoaderData>(
        {
          status: "error",
          message: "Missing Google authorization parameters. Please retry signing in with Google.",
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
          message: "We could not reach the authentication service. Please try signing in again.",
          supportUrl: SUPPORT_MAILTO,
          email,
        },
        { status: 502 },
      );
    }

    // Get ALL Set-Cookie headers (backend may send multiple)
    const setCookieHeaders = getAllSetCookieHeaders(response);

    if (response.ok) {
      const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));

      if (!parsed.success) {
        console.error("Unexpected Google verification payload", parsed.error);
        return json<LoaderData>(
          {
            status: "error",
            message: "We could not confirm your Google sign-in. Please try again.",
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
        // Forward all Set-Cookie headers
        for (const cookie of setCookieHeaders) {
          redirectResponse.headers.append("Set-Cookie", cookie);
        }
        return redirectResponse;
      }

      const successResponse = json<LoaderData>({
        status: parsed.data.status === "verified" ? "verified" : "pending",
        message:
          parsed.data.message ??
          (parsed.data.status === "verified"
            ? "Your Google account is connected. You are ready to continue."
            : "We are finalizing your account setup. You will be redirected soon."),
        supportUrl,
        email,
      });

      // Forward all Set-Cookie headers
      for (const cookie of setCookieHeaders) {
        successResponse.headers.append("Set-Cookie", cookie);
      }
      return successResponse;
    }

    const parsedError = apiErrorSchema.safeParse(await safeReadJson(response));
    return json<LoaderData>(
      {
        status: response.status === 400 ? "pending" : "error",
        message:
          parsedError.success && parsedError.data.message
            ? parsedError.data.message
            : "Google sign-in could not be completed. Please try again.",
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
          message: "We could not verify your email right now. Please try again or request a new link.",
          supportUrl: SUPPORT_MAILTO,
          email,
        },
        { status: 502 },
      );
    }

    // Get ALL Set-Cookie headers (backend may send multiple)
    const emailSetCookieHeaders = getAllSetCookieHeaders(response);

    if (response.ok) {
      const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));
      if (!parsed.success) {
        console.error("Unexpected email verification payload", parsed.error);
        return json<LoaderData>(
          {
            status: "error",
            message: "Your verification link is invalid or expired. Request a new one to continue.",
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
        // Forward all Set-Cookie headers
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
            ? "Your email is verified. You will be redirected to complete onboarding."
            : "We are finalizing your registration. This page will update shortly."),
        supportUrl,
        email,
      });

      // Forward all Set-Cookie headers
      for (const cookie of emailSetCookieHeaders) {
        successResponse.headers.append("Set-Cookie", cookie);
      }
      return successResponse;
    }

    const parsedError = apiErrorSchema.safeParse(await safeReadJson(response));
    return json<LoaderData>(
      {
        status: response.status === 400 ? "error" : "error",
        message:
          parsedError.success && parsedError.data.message
            ? parsedError.data.message
            : "Your verification link is invalid or expired. Request a new one to continue.",
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
        message: defaultPendingMessage(email),
        supportUrl: SUPPORT_MAILTO,
        email,
      },
      { status: 200 },
    );
  }

  // Get ALL Set-Cookie headers (backend may send multiple)
  const statusSetCookieHeaders = getAllSetCookieHeaders(response);

  if (response.ok) {
    const parsed = verificationStatusSchema.safeParse(await safeReadJson(response));

    if (parsed.success) {
      email = parsed.data.email ?? email;

      const resolvedRedirect = resolveRedirectTarget(parsed.data.redirectTo);
      if (resolvedRedirect && parsed.data.status === "verified") {
        const redirectResponse = redirect(resolvedRedirect);
        // Forward all Set-Cookie headers
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
            ? "Your account is verified and ready to use."
            : defaultPendingMessage(email)),
        supportUrl,
        email,
      });

      // Forward all Set-Cookie headers
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
        : defaultPendingMessage(email),
    supportUrl: SUPPORT_MAILTO,
    email,
  };

  const statusResponse = json<LoaderData>(responsePayload);
  // Forward all Set-Cookie headers
  for (const cookie of statusSetCookieHeaders) {
    statusResponse.headers.append("Set-Cookie", cookie);
  }
  return statusResponse;
}

export default function VerifyRoute() {
  const data = useLoaderData<typeof loader>();
  const continueHref = usePublicHref("/app/features/app-library");

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Verify your account</h1>
        <p className="text-base text-slate-600">
          {data.email ? (
            <>
              We sent a secure link to <strong className="font-semibold text-slate-900">{data.email}</strong>. Complete
              the steps in that message to activate your access.
            </>
          ) : (
            "We sent you a secure link. Complete the steps in that message to activate your access."
          )}
        </p>
      </header>

      <VerificationBanner status={data.status} message={data.message} supportUrl={data.supportUrl} />

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-left text-sm text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Need a hand?</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Check your spam folder if the message does not arrive within a minute.</li>
          <li>Verification links expire after 15 minutes for your security.</li>
          <li>
            Still waiting?{" "}
            <a href={SUPPORT_MAILTO} className="font-semibold text-blue-600 underline">
              Contact support
            </a>{" "}
            for a fresh link.
          </li>
        </ul>
      </div>

      {data.status === "verified" ? (
        <div className="flex justify-center">
          <Link
            to={continueHref}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            Continue onboarding
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function defaultPendingMessage(email?: string) {
  return email
    ? `Check ${email} for your verification link. You can close this tab once you're confirmed.`
    : "Check your inbox for the verification link we just sent.";
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

/**
 * Extract all Set-Cookie headers from a response
 * The Fetch API headers.get() only returns the first value,
 * so we need to use getSetCookie() or parse raw headers
 */
function getAllSetCookieHeaders(response: Response): string[] {
  // Modern browsers support getSetCookie()
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  // Fallback: try to get raw headers (Node.js)
  const rawHeaders = (response.headers as any).raw?.();
  if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
    return rawHeaders["set-cookie"];
  }

  // Last resort: get single header
  const singleHeader = response.headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}
