import { Form } from "@remix-run/react";
import type { FC } from "react";

type Props = {
  csrfToken: string;
  defaultEmail?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  formError?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export const AdminSigninForm: FC<Props> = ({
  csrfToken,
  defaultEmail,
  fieldErrors,
  formError,
  isSubmitting = false,
  disabled = false,
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle geometric background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)
        `
      }} />

      {/* Signin Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '48px',
        animation: 'slideUp 0.6s ease-out'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 600,
            color: '#1e293b',
            letterSpacing: '-0.02em',
            marginBottom: '8px'
          }}>
            Welcome back
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
            lineHeight: 1.5
          }}>
            Sign in to access your dashboard securely
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              marginBottom: '24px',
              padding: '14px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#991b1b',
              fontSize: '14px',
              lineHeight: 1.5,
              animation: 'shake 0.4s ease-out'
            }}
          >
            {formError}
          </div>
        )}

        {/* Form */}
        <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email Field */}
          <div>
            <label
              htmlFor="admin-signin-email"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Email address
            </label>
            <input
              id="admin-signin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={defaultEmail}
              required
              disabled={disabled || isSubmitting}
              aria-invalid={Boolean(fieldErrors?.email) || undefined}
              aria-describedby={fieldErrors?.email ? "admin-signin-email-error" : undefined}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                color: '#1e293b',
                background: '#ffffff',
                border: fieldErrors?.email ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                if (!fieldErrors?.email) {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
            {fieldErrors?.email && (
              <p
                id="admin-signin-email-error"
                role="alert"
                style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                htmlFor="admin-signin-password"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#334155'
                }}
              >
                Password
              </label>
              <a
                href="#"
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
              >
                Forgot password?
              </a>
            </div>
            <input
              id="admin-signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={disabled || isSubmitting}
              aria-invalid={Boolean(fieldErrors?.password) || undefined}
              aria-describedby={fieldErrors?.password ? "admin-signin-password-error" : undefined}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                color: '#1e293b',
                background: '#ffffff',
                border: fieldErrors?.password ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                if (!fieldErrors?.password) {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
            {fieldErrors?.password && (
              <p
                id="admin-signin-password-error"
                role="alert"
                style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="intent" value="admin-signin" />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || disabled}
            aria-busy={isSubmitting}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              background: isSubmitting || disabled ? '#94a3b8' : '#1e40af',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting || disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !disabled) {
                e.currentTarget.style.background = '#1e3a8a';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30,64,175,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !disabled) {
                e.currentTarget.style.background = '#1e40af';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isSubmitting ? 'Signing you in...' : 'Sign in'}
          </button>
        </Form>
      </div>

      {/* Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
        `
      }} />
    </div>
  );
};
