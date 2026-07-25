import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { z } from "zod";

import { LoginForm } from "../ui/LoginForm";
import { RegistrationForm } from "../ui/RegistrationForm";
import i18next from "../../../i18next.server";
import { getBackAuthEnv } from "../../../utils/env.server";
import { fetchWithTransientRetry } from "../../../utils/http.server";
import { resolvePublicPath, resolveRedirectTarget } from "../../../utils/publicPath.server";
import { getVerifiedRegistrationSession } from "../../../utils/user-registration-status.server";

const DEFAULT_PASSWORD_MIN_LENGTH = 12;

const registrationConfigSchema = z
  .object({
    csrfToken: z.string().min(1),
    providers: z
      .object({
        google: z
          .object({
            authorizeUrl: z.string().url(),
            buttonText: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    email: z
      .object({
        passwordPolicy: z
          .object({
            minLength: z.number().int().min(8).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

const apiRegistrationResponseSchema = z
  .object({
    status: z.enum(["pending_verification", "complete"]),
    redirectTo: z.string().optional(),
    next: z
      .object({
        redirectTo: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const apiRegistrationErrorSchema = z
  .object({
    message: z.string().optional(),
    fieldErrors: z
      .object({
        email: z.string().optional(),
        password: z.string().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

const apiLoginResponseSchema = z
  .object({
    status: z.enum(["authenticated", "pending_verification"]),
    redirectTo: z.string().optional(),
    email: z.string().email().optional(),
    message: z.string().optional(),
    next: z
      .object({
        redirectTo: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const apiLoginErrorSchema = z
  .object({
    status: z.string().optional(),
    message: z.string().optional(),
    fieldErrors: z
      .object({
        email: z.string().optional(),
        password: z.string().optional(),
      })
      .partial()
      .optional(),
    next: z
      .object({
        redirectTo: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

type LoaderData = {
  csrfToken: string;
  googleAuthUrl: string | null;
  googleButtonText: string;
  passwordMinLength: number;
  serviceAvailable: boolean;
  serviceMessage?: string;
  initialMode: AuthMode;
};

type ActionData = {
  register?: FormState;
  login?: FormState;
};

type FormState = {
  status: "validation-error" | "server-error";
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  values?: {
    email?: string;
  };
};

type AuthMode = "register" | "login";

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to");
  const session = await getVerifiedRegistrationSession(request);
  if (session?.verified) {
    const next =
      resolveRedirectTarget(returnTo) ?? resolvePublicPath("/features/app-library");
    return redirect(next);
  }

  const initialMode = parseModeParam(url.searchParams.get("mode"));
  const { backAuthBaseUrl } = getBackAuthEnv();
  const configUrl = new URL("/user-registration/config", backAuthBaseUrl);

  let configResponse: Response;
  try {
    configResponse = await fetchWithTransientRetry(
      configUrl,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error("Failed to request registration config (after retries)", error);
    const fallback = buildFallbackData(t("auth.errors.serviceNotReady"), t);
    fallback.initialMode = initialMode;
    return json<LoaderData>(fallback);
  }

  if (!configResponse.ok) {
    console.error("Registration config request failed", configResponse.status, await safeReadJson(configResponse));
    const fallback = buildFallbackData(t("auth.errors.configLoadError"), t);
    fallback.initialMode = initialMode;
    return json<LoaderData>(fallback);
  }

  const rawConfig = await safeReadJson(configResponse);
  const parsedConfig = registrationConfigSchema.safeParse(rawConfig);

  if (!parsedConfig.success) {
    console.error("Registration config validation error", parsedConfig.error);
    const fallback = buildFallbackData(t("auth.errors.registrationSettingsUnavailable"), t);
    fallback.initialMode = initialMode;
    return json<LoaderData>(fallback);
  }

  const passwordMinLength =
    parsedConfig.data.email?.passwordPolicy?.minLength && parsedConfig.data.email.passwordPolicy.minLength >= 8
      ? parsedConfig.data.email.passwordPolicy.minLength
      : DEFAULT_PASSWORD_MIN_LENGTH;

  const responsePayload: LoaderData = {
    csrfToken: parsedConfig.data.csrfToken,
    googleAuthUrl: parsedConfig.data.providers?.google?.authorizeUrl ?? null,
    googleButtonText: parsedConfig.data.providers?.google?.buttonText ?? t("auth.register.googleButton"),
    passwordMinLength,
    serviceAvailable: true,
    initialMode,
  };

  const rawHeaders = (configResponse.headers as unknown as { raw?: () => Record<string, string[]> }).raw?.();
  let setCookies = rawHeaders?.["set-cookie"] ?? [];
  if (!setCookies.length) {
    const single = configResponse.headers.get("set-cookie");
    if (single) {
      setCookies = [single];
    }
  }

  const jsonResponse = json<LoaderData>(responsePayload);
  for (const cookie of setCookies) {
    jsonResponse.headers.append("Set-Cookie", cookie);
  }

  return jsonResponse;
}

export async function action({ request }: ActionFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const formData = await request.formData();
  const intent = parseIntent(formData.get("intent"));

  if (intent === "login") {
    return handleLoginSubmission(request, formData, t);
  }

  return handleRegistrationSubmission(request, formData, t);
}

export default function RegistrationRoute() {
  const { t } = useTranslation();
  const {
    csrfToken,
    googleAuthUrl,
    googleButtonText,
    passwordMinLength,
    serviceAvailable,
    serviceMessage,
    initialMode,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamMode = searchParams.get("mode");
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (actionData?.login) {
      setMode("login");
    } else if (actionData?.register) {
      setMode("register");
    }
  }, [actionData]);

  useEffect(() => {
    if (mode === "login") {
      if (searchParamMode === "login") {
        return;
      }
      // Don't add login param if we're transitioning TO register
      // (URL wants register but state hasn't caught up yet)
      if (initialMode === "register") {
        return;
      }
      const next = new URLSearchParams(searchParams);
      next.set("mode", "login");
      setSearchParams(next, { preventScrollReset: true, replace: true });
      return;
    }

    if (!searchParamMode) {
      return;
    }

    // Don't remove the mode param if we're transitioning TO login
    // (URL says login but state hasn't caught up yet)
    if (initialMode === "login" && mode !== "login") {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { preventScrollReset: true, replace: true });
  }, [mode, searchParamMode, initialMode]);

  const copy = useMemo(() => {
    if (mode === "login") {
      return {
        kicker: t("auth.login.kicker"),
        title: t("auth.login.title"),
        description: t("auth.login.description"),
        googleLabel: t("auth.login.googleButton"),
        emailDivider: t("auth.login.emailDivider"),
        hint: t("auth.login.hint"),
        hintCta: t("auth.login.hintCta"),
        hintMode: "register" as AuthMode,
      };
    }

    return {
      kicker: t("auth.register.kicker"),
      title: t("auth.register.title"),
      description: t("auth.register.description"),
      googleLabel: googleButtonText || t("auth.register.googleButton"),
      emailDivider: t("auth.register.emailDivider"),
      hint: t("auth.register.hint"),
      hintCta: t("auth.register.hintCta"),
      hintMode: "login" as AuthMode,
    };
  }, [mode, googleButtonText, t]);

  const registerState = actionData?.register;
  const loginState = actionData?.login;

  const activeIntent = navigation.state === "submitting" ? navigation.formData?.get("intent") : null;
  const isRegisterSubmitting = navigation.state === "submitting" && activeIntent === "register";
  const isLoginSubmitting = navigation.state === "submitting" && activeIntent === "login";

  const serviceAlert =
    serviceAvailable || !serviceMessage ? null : serviceMessage ?? t("auth.serviceOffline");

  const handleToggleKey = (event: KeyboardEvent<HTMLButtonElement>, targetMode: AuthMode) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      setMode("register");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      setMode("login");
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      setMode(targetMode);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-grid">
        <div className="auth-card" data-mode={mode}>
          <header className="auth-header">
            <span className="auth-kicker">{copy.kicker}</span>
            <h1 className="auth-title">{copy.title}</h1>
            <p className="auth-subtitle">{copy.description}</p>
          </header>

          <div role="tablist" aria-label={t("a11y.authFlowTabs")} className="auth-toggle">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={["auth-toggle-button", mode === "register" ? "is-active" : ""].join(" ").trim()}
              onClick={() => setMode("register")}
              onKeyDown={(event) => handleToggleKey(event, "register")}
            >
              {t("auth.tabs.register")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={["auth-toggle-button", mode === "login" ? "is-active" : ""].join(" ").trim()}
              onClick={() => setMode("login")}
              onKeyDown={(event) => handleToggleKey(event, "login")}
            >
              {t("auth.tabs.login")}
            </button>
          </div>

          {serviceAlert ? (
            <div className="auth-alert" role="status">
              {serviceAlert}
            </div>
          ) : null}

          {serviceAvailable && googleAuthUrl ? (
            <a
              href={googleAuthUrl}
              className="auth-google"
              rel="nofollow"
              aria-label={copy.googleLabel}
              data-variant={mode}
            >
              <GoogleIcon />
              <span>{copy.googleLabel}</span>
            </a>
          ) : (
            <div className="auth-alert subtle" role="status">
              {serviceAvailable ? t("auth.alerts.googleUnavailable") : t("auth.alerts.googleUnavailableOffline")}
            </div>
          )}

          <div className="auth-divider">
            <span>{copy.emailDivider}</span>
          </div>

          {mode === "login" ? (
            <LoginForm
              csrfToken={csrfToken}
              defaultEmail={loginState?.values?.email ?? registerState?.values?.email}
              fieldErrors={loginState?.fieldErrors}
              formError={loginState?.formError}
              isSubmitting={isLoginSubmitting}
              disabled={!serviceAvailable}
            />
          ) : (
            <RegistrationForm
              csrfToken={csrfToken}
              passwordMinLength={passwordMinLength}
              defaultEmail={registerState?.values?.email ?? loginState?.values?.email}
              fieldErrors={registerState?.fieldErrors}
              formError={registerState?.formError}
              isSubmitting={isRegisterSubmitting}
              disabled={!serviceAvailable}
            />
          )}

          <p className="auth-hint">
            {copy.hint}{" "}
            <button type="button" className="auth-hint-button" onClick={() => setMode(copy.hintMode)}>
              {copy.hintCta}
            </button>
          </p>
        </div>

        <aside className="auth-aside">
          <h2>{t("auth.aside.title")}</h2>
          <ul>
            <li>{t("auth.aside.step1")}</li>
            <li>{t("auth.aside.step2")}</li>
            <li>{t("auth.aside.step3")}</li>
          </ul>
          <div className="auth-support">
            <strong>{t("auth.aside.support.title")}</strong>
            <p>
              <Trans
                i18nKey="auth.aside.support.description"
                components={{
                  1: (
                    <a href="mailto:support@tools-dashboard.io" className="auth-support-link">
                      support@tools-dashboard.io
                    </a>
                  ),
                }}
              />
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function buildFallbackData(message: string, t: TFunction): LoaderData {
  return {
    csrfToken: "",
    googleAuthUrl: null,
    googleButtonText: t("auth.register.googleButton"),
    passwordMinLength: DEFAULT_PASSWORD_MIN_LENGTH,
    serviceAvailable: false,
    serviceMessage: message,
    initialMode: "register",
  };
}

function parseModeParam(value: string | null): AuthMode {
  if (!value) {
    return "register";
  }
  const normalized = value.toLowerCase();
  if (["login", "signin", "sign-in", "sign_in"].includes(normalized)) {
    return "login";
  }
  return "register";
}

function parseIntent(value: FormDataEntryValue | null): AuthMode {
  if (typeof value !== "string") {
    return "register";
  }
  const normalized = value.toLowerCase();
  return normalized === "login" ? "login" : "register";
}

async function handleRegistrationSubmission(request: Request, formData: FormData, t: TFunction): Promise<Response> {
  const rawPasswordMinLength = formData.get("passwordPolicyMinLength");
  const parsedPasswordMinLength =
    typeof rawPasswordMinLength === "string" && !Number.isNaN(Number.parseInt(rawPasswordMinLength, 10))
      ? Number.parseInt(rawPasswordMinLength, 10)
      : undefined;
  const effectivePasswordMinLength =
    parsedPasswordMinLength && parsedPasswordMinLength >= 8 ? parsedPasswordMinLength : DEFAULT_PASSWORD_MIN_LENGTH;

  const formSchema = buildEmailFormSchema(effectivePasswordMinLength, t);
  const submission = {
    email: formData.get("email"),
    password: formData.get("password"),
    csrfToken: formData.get("csrfToken"),
  };

  const parsedSubmission = formSchema.safeParse(submission);

  if (!parsedSubmission.success) {
    const flattened = parsedSubmission.error.flatten();
    return json<ActionData>(
      {
        register: {
          status: "validation-error",
          fieldErrors: {
            email: flattened.fieldErrors.email?.[0],
            password: flattened.fieldErrors.password?.[0],
          },
          formError: flattened.formErrors[0] ?? flattened.fieldErrors.csrfToken?.[0],
          values: {
            email: typeof submission.email === "string" ? submission.email : undefined,
          },
        },
      },
      { status: 400 },
    );
  }

  const { email, password, csrfToken } = parsedSubmission.data;
  const { backAuthBaseUrl } = getBackAuthEnv();

  const registerUrl = new URL("/user-registration", backAuthBaseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-CSRF-Token": csrfToken,
  };

  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(registerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error("Registration request failed", error);
    return json<ActionData>(
      {
        register: {
          status: "server-error",
          formError: t("auth.errors.serviceUnreachable"),
          values: { email },
        },
      },
      { status: 502 },
    );
  }

  if (apiResponse.ok) {
    const parsedResponse = apiRegistrationResponseSchema.safeParse(await safeReadJson(apiResponse));

    if (!parsedResponse.success) {
      console.error("Unexpected registration response payload", parsedResponse.error);
      return json<ActionData>(
        {
          register: {
            status: "server-error",
            formError: t("auth.errors.unexpectedResponse"),
            values: { email },
          },
        },
        { status: 502 },
      );
    }

    const fallbackRedirect = resolvePublicPath("/features/user-registration/verify?source=email");
    const targetRedirect =
      resolveRedirectTarget(parsedResponse.data.redirectTo) ??
      resolveRedirectTarget(parsedResponse.data.next?.redirectTo) ??
      fallbackRedirect;

    const successRedirect = redirect(targetRedirect);
    // Forward all Set-Cookie headers (backend may send multiple)
    const setCookies = getAllSetCookieHeaders(apiResponse);
    for (const cookie of setCookies) {
      successRedirect.headers.append("Set-Cookie", cookie);
    }
    return successRedirect;
  }

  const parsedError = apiRegistrationErrorSchema.safeParse(await safeReadJson(apiResponse));
  const status = apiResponse.status === 400 ? 400 : 502;

  if (parsedError.success) {
    return json<ActionData>(
      {
        register: {
          status: apiResponse.status === 400 ? "validation-error" : "server-error",
          fieldErrors: {
            email: parsedError.data.fieldErrors?.email,
            password: parsedError.data.fieldErrors?.password,
          },
          formError:
            apiResponse.status === 400
              ? parsedError.data.message
              : parsedError.data.message ?? t("auth.errors.registrationFailed"),
          values: { email },
        },
      },
      { status },
    );
  }

  console.error("Registration API error response could not be parsed", apiResponse.status);

  return json<ActionData>(
    {
      register: {
        status: "server-error",
        formError: t("auth.errors.registrationFailedRetry"),
        values: { email },
      },
    },
    { status },
  );
}

async function handleLoginSubmission(request: Request, formData: FormData, t: TFunction): Promise<Response> {
  const formSchema = buildLoginFormSchema(t);
  const submission = {
    email: formData.get("email"),
    password: formData.get("password"),
    csrfToken: formData.get("csrfToken"),
  };

  const parsedSubmission = formSchema.safeParse(submission);

  if (!parsedSubmission.success) {
    const flattened = parsedSubmission.error.flatten();
    return json<ActionData>(
      {
        login: {
          status: "validation-error",
          fieldErrors: {
            email: flattened.fieldErrors.email?.[0],
            password: flattened.fieldErrors.password?.[0],
          },
          formError: flattened.formErrors[0] ?? flattened.fieldErrors.csrfToken?.[0],
          values: {
            email: typeof submission.email === "string" ? submission.email : undefined,
          },
        },
      },
      { status: 400 },
    );
  }

  const { email, password, csrfToken } = parsedSubmission.data;
  const { backAuthBaseUrl } = getBackAuthEnv();
  const loginUrl = new URL("/user-registration/login", backAuthBaseUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-CSRF-Token": csrfToken,
  };

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(loginUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error("Login request failed", error);
    return json<ActionData>(
      {
        login: {
          status: "server-error",
          formError: t("auth.errors.serviceUnreachable"),
          values: { email },
        },
      },
      { status: 502 },
    );
  }

  if (apiResponse.ok) {
    const parsedResponse = apiLoginResponseSchema.safeParse(await safeReadJson(apiResponse));

    if (!parsedResponse.success) {
      console.error("Unexpected login response payload", parsedResponse.error);
      return json<ActionData>(
        {
          login: {
            status: "server-error",
            formError: t("auth.errors.unexpectedResponse"),
            values: { email },
          },
        },
        { status: 502 },
      );
    }

    // Check for return_to query parameter (for OAuth flow)
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("return_to");

    const fallbackRedirect = resolvePublicPath("/app/features/app-library");
    const targetRedirect =
      resolveRedirectTarget(returnTo) ??
      resolveRedirectTarget(parsedResponse.data.redirectTo) ??
      resolveRedirectTarget(parsedResponse.data.next?.redirectTo) ??
      fallbackRedirect;

    const successRedirect = redirect(targetRedirect);
    // Forward all Set-Cookie headers (backend may send multiple)
    const loginSetCookies = getAllSetCookieHeaders(apiResponse);
    for (const cookie of loginSetCookies) {
      successRedirect.headers.append("Set-Cookie", cookie);
    }
    return successRedirect;
  }

  const parsedError = apiLoginErrorSchema.safeParse(await safeReadJson(apiResponse));
  const status = apiResponse.status === 400 ? 400 : apiResponse.status;

  if (parsedError.success) {
    return json<ActionData>(
      {
        login: {
          status: apiResponse.status === 400 ? "validation-error" : "server-error",
          fieldErrors: {
            email: parsedError.data.fieldErrors?.email,
            password: parsedError.data.fieldErrors?.password,
          },
          formError:
            parsedError.data.message ??
            (apiResponse.status === 403
              ? t("auth.errors.verifyEmailRequired")
              : t("auth.errors.loginFailed")),
          values: { email },
        },
      },
      { status },
    );
  }

  console.error("Login API error response could not be parsed", apiResponse.status);

  return json<ActionData>(
    {
      login: {
        status: "server-error",
        formError: t("auth.errors.loginFailedRetry"),
        values: { email },
      },
    },
    { status },
  );
}

function buildEmailFormSchema(passwordMinLength: number, t: TFunction) {
  const min = Math.max(passwordMinLength, 8);
  return z.object({
    email: z
      .string({ required_error: t("auth.validation.emailRequired") })
      .trim()
      .min(1, t("auth.validation.emailRequired"))
      .email(t("auth.validation.emailInvalid"))
      .transform((value) => value.toLowerCase()),
    password: z
      .string({ required_error: t("auth.validation.passwordRequired") })
      .min(min, t("auth.validation.passwordMinLength", { min }))
      .max(72, t("auth.validation.passwordTooLong")),
    csrfToken: z.string({ required_error: t("auth.validation.csrfRequired") }).min(1, t("auth.validation.csrfRequired")),
  });
}

function buildLoginFormSchema(t: TFunction) {
  return z.object({
    email: z
      .string({ required_error: t("auth.validation.emailRequired") })
      .trim()
      .min(1, t("auth.validation.emailRequired"))
      .email(t("auth.validation.emailInvalid"))
      .transform((value) => value.toLowerCase()),
    password: z
      .string({ required_error: t("auth.validation.passwordRequired") })
      .min(1, t("auth.validation.passwordRequired"))
      .max(72),
    csrfToken: z.string({ required_error: t("auth.validation.csrfRequired") }).min(1, t("auth.validation.csrfRequired")),
  });
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2045C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.8445H13.8436C13.635 11.9695 13.0009 12.9136 12.0409 13.5536V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1945 14.9564 15.8195L12.0409 13.5536C11.2564 14.0836 10.2236 14.4091 9 14.4091C6.65591 14.4091 4.67273 12.8264 3.96455 10.71H0.942261V13.0486C2.42273 15.9832 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96464 10.71C3.78464 10.18 3.681 9.61363 3.681 9.02273C3.681 8.43182 3.78464 7.86545 3.96464 7.33545V4.99682H0.942273C0.341727 6.22182 0 7.58636 0 9.02273C0 10.4591 0.341727 11.8236 0.942273 13.0486L3.96464 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.59091C10.3346 3.59091 11.5255 4.04818 12.4609 4.94864L15.0227 2.38636C13.4632 0.930909 11.4259 0 9 0C5.48182 0 2.42273 2.01682 0.942261 4.95136L3.96455 7.29C4.67273 5.17318 6.65591 3.59091 9 3.59091Z"
        fill="#EA4335"
      />
    </svg>
  );
}

