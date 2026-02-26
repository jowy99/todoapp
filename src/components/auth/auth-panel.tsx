"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/settings/locale-provider";
import { useAppToast } from "@/components/ui/toaster-provider";
import { fetchApi, isApiRequestError } from "@/lib/client-api";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register";
type ValidationField = "email" | "password" | "displayName" | "username";

type ValidationDetails = {
  fieldErrors?: Partial<Record<ValidationField, string[]>>;
  formErrors?: string[];
};

function readValidationDetails(details: unknown): ValidationDetails | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const payload = details as {
    fieldErrors?: unknown;
    formErrors?: unknown;
  };

  const fieldErrors: Partial<Record<ValidationField, string[]>> = {};
  if (payload.fieldErrors && typeof payload.fieldErrors === "object") {
    for (const field of ["email", "password", "displayName", "username"] as const) {
      const value = (payload.fieldErrors as Record<string, unknown>)[field];
      if (!Array.isArray(value)) {
        continue;
      }
      const normalized = value.filter((entry): entry is string => typeof entry === "string");
      if (normalized.length > 0) {
        fieldErrors[field] = normalized;
      }
    }
  }

  const formErrors = Array.isArray(payload.formErrors)
    ? payload.formErrors.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (Object.keys(fieldErrors).length === 0 && formErrors.length === 0) {
    return null;
  }

  return { fieldErrors, formErrors };
}

export function AuthPanel() {
  const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;
  const router = useRouter();
  const t = useT();
  const { pushToast } = useAppToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = useMemo(() => {
    return mode === "login" ? t("auth.submit.login") : t("auth.submit.register");
  }, [mode, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
    setDisplayNameError(null);
    setConfirmPasswordError(null);

    if (mode === "register") {
      let hasValidationError = false;

      if (displayName.trim().length < 2) {
        setDisplayNameError(t("auth.register.displayNameInvalid"));
        hasValidationError = true;
      }

      if (!usernamePattern.test(username.trim().toLowerCase())) {
        setUsernameError(t("auth.register.usernameInvalid"));
        hasValidationError = true;
      }

      if (password.length < 8) {
        setPasswordError(t("auth.register.passwordMin"));
        hasValidationError = true;
      }

      if (confirmPassword !== password) {
        setConfirmPasswordError(t("auth.register.passwordMismatch"));
        hasValidationError = true;
      }

      if (hasValidationError) {
        pushToast({
          variant: "error",
          message: t("auth.register.validation"),
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (mode === "login") {
        await fetchApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            identifier,
            password,
          }),
        });
      } else {
        await fetchApi("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            username: username.trim().toLowerCase(),
            displayName: displayName.trim(),
          }),
        });
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      if (mode === "login") {
        let message = t("auth.login.unexpected");
        if (isApiRequestError(submitError)) {
          if (submitError.status === 401) {
            message = t("auth.login.invalidCredentials");
          } else if (submitError.status === 429) {
            message = t("auth.login.rateLimit");
          }
        }

        pushToast({
          variant: "error",
          message,
        });
      } else {
        let message = t("auth.register.unexpected");
        if (isApiRequestError(submitError)) {
          if (submitError.status === 409) {
            message = t("auth.register.conflict");
          } else if (submitError.status === 400) {
            message = t("auth.register.validation");
            const validationDetails = readValidationDetails(submitError.details);
            if (validationDetails?.fieldErrors?.email?.length) {
              setEmailError(t("auth.register.emailInvalid"));
            }
            if (validationDetails?.fieldErrors?.displayName?.length) {
              setDisplayNameError(t("auth.register.displayNameInvalid"));
            }
            if (validationDetails?.fieldErrors?.username?.length) {
              setUsernameError(t("auth.register.usernameInvalid"));
            }
            if (validationDetails?.fieldErrors?.password?.length) {
              setPasswordError(t("auth.register.passwordInvalid"));
            }
          } else if (submitError.status === 429) {
            message = t("auth.register.rateLimit");
          }
        }

        pushToast({
          variant: "error",
          message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="ui-card ui-card--hero shadow-primary/10 relative w-full max-w-md p-5 sm:p-7">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-2xl"
      />
      <div
        aria-hidden
        className="bg-accent/15 pointer-events-none absolute -bottom-20 -left-14 h-36 w-36 rounded-full blur-2xl"
      />
      <header className="mb-6 space-y-2">
        <span className="ui-chip bg-primary/10 text-primary-strong inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {t("auth.badge")}
        </span>
        <h1 className="ui-title-xl text-primary-strong">
          {t("app.title")}
        </h1>
        <p className="ui-subtle leading-relaxed">
          {t("auth.subtitle")}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t("auth.mode.aria")}
        className="mb-6 grid grid-cols-2 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => setMode("login")}
          className={`ui-btn rounded-full border-0 px-3 py-2 text-sm ${
            mode === "login"
              ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)] ring-1 ring-[color:var(--primary-600)]"
              : "bg-transparent text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
          }`}
        >
          {t("auth.mode.login")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => setMode("register")}
          className={`ui-btn rounded-full border-0 px-3 py-2 text-sm ${
            mode === "register"
              ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)] ring-1 ring-[color:var(--primary-600)]"
              : "bg-transparent text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
          }`}
        >
          {t("auth.mode.register")}
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("auth.fields.displayName")}</span>
            <Input
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setDisplayNameError(null);
              }}
              className="ui-field w-full"
              placeholder={t("auth.fields.displayNamePlaceholder")}
              autoComplete="name"
              aria-invalid={displayNameError ? true : undefined}
              aria-describedby={displayNameError ? "register-display-name-error" : undefined}
            />
            {displayNameError ? (
              <p id="register-display-name-error" className="text-sm font-medium text-[color:var(--error)]">
                {displayNameError}
              </p>
            ) : null}
          </label>
        ) : null}

        {mode === "register" ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("auth.fields.username")}</span>
            <Input
              required
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameError(null);
              }}
              className="ui-field w-full"
              placeholder={t("auth.fields.usernamePlaceholder")}
              autoComplete="username"
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? "register-username-error" : undefined}
            />
            {usernameError ? (
              <p id="register-username-error" className="text-sm font-medium text-[color:var(--error)]">
                {usernameError}
              </p>
            ) : null}
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium">
            {mode === "login" ? t("auth.fields.identifier") : t("auth.fields.email")}
          </span>
          <Input
            required
            type={mode === "login" ? "text" : "email"}
            value={mode === "login" ? identifier : email}
            onChange={(event) => {
              if (mode === "login") {
                setIdentifier(event.target.value);
              } else {
                setEmail(event.target.value);
              }
              if (mode === "register") {
                setEmailError(null);
              }
            }}
            className="ui-field w-full"
            placeholder={mode === "login" ? t("auth.fields.identifierPlaceholder") : t("auth.fields.emailPlaceholder")}
            autoComplete={mode === "login" ? "username" : "email"}
            aria-invalid={mode === "register" && emailError ? true : undefined}
            aria-describedby={mode === "register" && emailError ? "register-email-error" : undefined}
          />
          {mode === "register" && emailError ? (
            <p id="register-email-error" className="text-sm font-medium text-[color:var(--error)]">
              {emailError}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("auth.fields.password")}</span>
          <Input
            required
            type="password"
            minLength={mode === "login" ? 8 : undefined}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (mode === "register") {
                setPasswordError(null);
                setConfirmPasswordError(null);
              }
            }}
            className="ui-field w-full"
            placeholder={t("auth.fields.passwordPlaceholder")}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            aria-invalid={mode === "register" && passwordError ? true : undefined}
            aria-describedby={mode === "register" && passwordError ? "register-password-error" : undefined}
          />
          {mode === "register" && passwordError ? (
            <p id="register-password-error" className="text-sm font-medium text-[color:var(--error)]">
              {passwordError}
            </p>
          ) : null}
        </label>

        {mode === "register" ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("auth.register.confirmPassword")}</span>
            <Input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setConfirmPasswordError(null);
              }}
              className="ui-field w-full"
              placeholder={t("auth.fields.passwordPlaceholder")}
              autoComplete="new-password"
              aria-invalid={confirmPasswordError ? true : undefined}
              aria-describedby={confirmPasswordError ? "register-confirm-password-error" : undefined}
            />
            {confirmPasswordError ? (
              <p
                id="register-confirm-password-error"
                className="text-sm font-medium text-[color:var(--error)]"
              >
                {confirmPasswordError}
              </p>
            ) : null}
          </label>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-btn ui-btn--primary w-full disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("auth.submit.processing") : submitLabel}
        </button>
      </form>
    </section>
  );
}
