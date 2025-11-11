import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { z } from "zod";
import { RegistrationForm } from "../ui/RegistrationForm";
import { getBackAuthEnv } from "../../../utils/env.server";
import { resolvePublicPath, resolveRedirectTarget } from "../../../utils/publicPath.server";

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

type LoaderData = {
  csrfToken: string;
  googleAuthUrl: string | null;
  googleButtonText: string;
  passwordMinLength: number;
  serviceAvailable: boolean;
  serviceMessage?: string;
};

function buildFallbackData(message: string): LoaderData {
  return {
    csrfToken: "",
    googleAuthUrl: null,
    googleButtonText: "Continue with Google",
    passwordMinLength: DEFAULT_PASSWORD_MIN_LENGTH,
    serviceAvailable: false,
    serviceMessage: message,
  };
}

type ActionData = {
  status: "validation-error" | "server-error";
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  values?: {
    email?: string;
  };
};

export async function loader({ request }: LoaderFunctionArgs) {
  void request;
  const { backAuthBaseUrl } = getBackAuthEnv();
  const configUrl = new URL("/user-registration/config", backAuthBaseUrl);

  let configResponse: Response;
  try {
    configResponse = await fetch(configUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to request registration config", error);
    return json<LoaderData>(buildFallbackData("Authentication service is currently unavailable. Please try again later."));
  }

  if (!configResponse.ok) {
    console.error("Registration config request failed", configResponse.status, await safeReadJson(configResponse));
    return json<LoaderData>(buildFallbackData("We could not load registration settings. Please try again shortly."));
  }

  const rawConfig = await safeReadJson(configResponse);
  const parsedConfig = registrationConfigSchema.safeParse(rawConfig);

  if (!parsedConfig.success) {
    console.error("Registration config validation error", parsedConfig.error);
    return json<LoaderData>(buildFallbackData("Registration settings are unavailable. Please try again later."));
  }

  const passwordMinLength =
    parsedConfig.data.email?.passwordPolicy?.minLength && parsedConfig.data.email.passwordPolicy.minLength >= 8
      ? parsedConfig.data.email.passwordPolicy.minLength
      : DEFAULT_PASSWORD_MIN_LENGTH;

  const responsePayload: LoaderData = {
    csrfToken: parsedConfig.data.csrfToken,
    googleAuthUrl: parsedConfig.data.providers?.google?.authorizeUrl ?? null,
    googleButtonText: parsedConfig.data.providers?.google?.buttonText ?? "Continue with Google",
    passwordMinLength,
    serviceAvailable: true,
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
  const formData = await request.formData();

  const rawPasswordMinLength = formData.get("passwordPolicyMinLength");
  const parsedPasswordMinLength =
    typeof rawPasswordMinLength === "string" && !Number.isNaN(Number.parseInt(rawPasswordMinLength, 10))
      ? Number.parseInt(rawPasswordMinLength, 10)
      : undefined;
  const effectivePasswordMinLength =
    parsedPasswordMinLength && parsedPasswordMinLength >= 8 ? parsedPasswordMinLength : DEFAULT_PASSWORD_MIN_LENGTH;

  const formSchema = buildEmailFormSchema(effectivePasswordMinLength);

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
      body: JSON.stringify({
        email,
        password,
      }),
    });
  } catch (error) {
    console.error("Registration request failed", error);
    return json<ActionData>(
      {
        status: "server-error",
        formError: "We could not reach the authentication service. Please try again.",
        values: { email },
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
          status: "server-error",
          formError: "We received an unexpected response from the authentication service.",
          values: { email },
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
    const setCookie = apiResponse.headers.get("set-cookie");
    if (setCookie) {
      successRedirect.headers.append("Set-Cookie", setCookie);
    }
    return successRedirect;
  }

  const parsedError = apiRegistrationErrorSchema.safeParse(await safeReadJson(apiResponse));
  const status = apiResponse.status === 400 ? 400 : 502;

  if (parsedError.success) {
    return json<ActionData>(
      {
        status: apiResponse.status === 400 ? "validation-error" : "server-error",
        fieldErrors: {
          email: parsedError.data.fieldErrors?.email,
          password: parsedError.data.fieldErrors?.password,
        },
        formError:
          apiResponse.status === 400
            ? parsedError.data.message
            : parsedError.data.message ?? "We could not complete your registration.",
        values: { email },
      },
      { status },
    );
  }

  console.error("Registration API error response could not be parsed", apiResponse.status);

  return json<ActionData>(
    {
      status: "server-error",
      formError: "We could not complete your registration. Please try again shortly.",
      values: { email },
    },
    { status },
  );
}

export default function RegistrationRoute() {
  const { csrfToken, googleAuthUrl, googleButtonText, passwordMinLength, serviceAvailable, serviceMessage } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.fieldErrors ?? {};
  const formError = actionData?.formError;
  const defaultEmail = actionData?.values?.email;

  return (
    <section className="grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-8">
        <header className="space-y-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">Create your account</span>
          <h1 className="text-3xl font-semibold text-slate-900">Trusted access to Tools Dashboard</h1>
          <p className="text-base text-slate-600">
            Choose Google single sign-on or email plus password. We will guide you through verification to keep your
            workspace secured.
          </p>
        </header>

        {serviceAvailable ? null : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {serviceMessage ??
              "Registration is temporarily unavailable while we restore connectivity. Please check back in a moment."}
          </div>
        )}

        {serviceAvailable && googleAuthUrl ? (
          <a
            href={googleAuthUrl}
            className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <GoogleIcon />
            {googleButtonText}
          </a>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {serviceAvailable
              ? "Google sign-in is currently unavailable. Please continue with email."
              : "Google sign-in is unavailable until the authentication service reconnects."}
          </div>
        )}

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">or email</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <RegistrationForm
          csrfToken={csrfToken}
          passwordMinLength={passwordMinLength}
          defaultEmail={defaultEmail}
          fieldErrors={fieldErrors}
          formError={formError}
          isSubmitting={isSubmitting}
          disabled={!serviceAvailable}
        />
      </div>

      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">What happens next?</h2>
        <ul className="list-disc space-y-3 pl-5">
          <li>We send a verification email to confirm your address.</li>
          <li>Finish progressive profiling to tailor your workspace access.</li>
          <li>Use secure session cookies for seamless, device-aware sign-ins.</li>
        </ul>
        <p className="text-slate-500">
          Need help? Email <a href="mailto:support@tools-dashboard.io" className="underline">support@tools-dashboard.io</a>.
        </p>
      </aside>
    </section>
  );
}

function buildEmailFormSchema(passwordMinLength: number) {
  const min = Math.max(passwordMinLength, 8);
  return z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .transform((value) => value.toLowerCase()),
    password: z
      .string({ required_error: "Password is required" })
      .min(min, `Password must be at least ${min} characters long`)
      .max(72, "Password must be 72 characters or fewer"),
    csrfToken: z.string({ required_error: "Missing security token" }).min(1, "Missing security token"),
  });
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
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
