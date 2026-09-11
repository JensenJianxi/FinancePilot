import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { EyeIcon, EyeOffIcon } from "../../components/ui/icons";
import { useAuth } from "../../app/AuthProvider";
import type { AuthBanner, AuthRouteState } from "../../types/auth";
import { isAuthServiceError } from "../../services/auth/authService";
import { AuthFormField } from "./AuthFormField";
import { AuthScaffold } from "./AuthScaffold";

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type RegisterFormValues = {
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
};

function getRouteBanner(state: unknown): AuthBanner | null {
  const routeState = state as AuthRouteState | null;
  return routeState?.banner ?? null;
}

function getRedirectPath(state: unknown): string {
  const routeState = state as AuthRouteState | null;
  const pathname = routeState?.from?.pathname;

  if (!pathname || pathname === "/login" || pathname === "/register") {
    return "/";
  }

  return `${pathname}${routeState?.from?.search ?? ""}${routeState?.from?.hash ?? ""}`;
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  return mode === "login" ? <LoginForm /> : <RegisterForm />;
}

function LoginForm() {
  const { configurationError, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<AuthBanner | null>(getRouteBanner(location.state));
  const [passwordVisible, setPasswordVisible] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email("Enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        rememberMe: z.boolean()
      }),
    []
  );

  const form = useForm<LoginFormValues>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true
    }
  });
  const shouldShowFieldError = (fieldName: keyof LoginFormValues) =>
    form.formState.isSubmitted || Boolean(form.formState.touchedFields[fieldName]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFeedback(null);

      try {
        await signIn(values);
        navigate(getRedirectPath(location.state), { replace: true });
      } catch (error) {
        if (isAuthServiceError(error) && error.code === "UserNotConfirmedException") {
          navigate(`/confirm-email?email=${encodeURIComponent(values.email)}`, {
            replace: true,
            state: {
              banner: {
                message: "Confirm your email before signing in. We can resend the code from the next screen.",
                tone: "info"
              }
            } satisfies AuthRouteState
          });
          return;
        }

        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "We could not sign you in. Please try again.",
          tone: "error"
        });
      }
    },
    () => {
      setFeedback({
        message: "Please fix the highlighted fields before continuing.",
        tone: "error"
      });
    }
  );

  return (
    <AuthScaffold
      banner={feedback ?? (configurationError ? { message: configurationError, tone: "error" } : null)}
      footer={
        <Link className="auth-switch-link" to="/register">
          Create an account
        </Link>
      }
      subtitle="Sign in to continue managing your finances."
      title="Welcome back"
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthFormField
          error={shouldShowFieldError("email") ? form.formState.errors.email?.message : undefined}
          label="Email"
          render={<input {...form.register("email")} placeholder="JohnDoe@example.com" type="email" />}
        />

        <AuthFormField
          error={shouldShowFieldError("password") ? form.formState.errors.password?.message : undefined}
          label="Password"
          render={
            <div className="input-with-action">
              <input
                {...form.register("password")}
                placeholder="At least 8 characters"
                type={passwordVisible ? "text" : "password"}
              />
              <button
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                className="input-action"
                onClick={() => setPasswordVisible((current) => !current)}
                type="button"
              >
                {passwordVisible ? (
                  <EyeOffIcon className="input-action-icon" />
                ) : (
                  <EyeIcon className="input-action-icon" />
                )}
              </button>
            </div>
          }
        />

        <button className="primary-cta auth-primary-cta" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Signing in..." : "Login"}
        </button>

        <div className="auth-inline-row auth-support-row">
          <label className="checkbox-field">
            <input {...form.register("rememberMe")} type="checkbox" />
            <span>Remember me</span>
          </label>
          <Link className="text-button" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthScaffold>
  );
}

function RegisterForm() {
  const { configurationError, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<null | { tone: "error" | "success"; text: string }>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          confirmPassword: z.string().min(8, "Confirm your password"),
          email: z.string().email("Enter a valid email address"),
          name: z.string().trim().min(2, "Enter your full name"),
          password: z.string().min(8, "Password must be at least 8 characters")
        })
        .superRefine((values, context) => {
          if (values.password !== values.confirmPassword) {
            context.addIssue({
              code: "custom",
              message: "Passwords do not match",
              path: ["confirmPassword"]
            });
          }
        }),
    []
  );

  const form = useForm<RegisterFormValues>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: ""
    }
  });
  const shouldShowFieldError = (fieldName: keyof RegisterFormValues) =>
    form.formState.isSubmitted || Boolean(form.formState.touchedFields[fieldName]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFeedback(null);

      try {
        const result = await signUp({
          email: values.email,
          fullName: values.name,
          password: values.password
        });

        if (result.isConfirmed) {
          navigate("/login", {
            replace: true,
            state: {
              banner: {
                message: "Account created successfully. Sign in to continue.",
                tone: "success"
              }
            } satisfies AuthRouteState
          });
          return;
        }

        navigate(`/confirm-email?email=${encodeURIComponent(values.email)}`, {
          replace: true,
          state: {
            banner: {
              message: result.codeDeliveryDestination
                ? `We sent a verification code to ${result.codeDeliveryDestination}.`
                : "We sent a verification code to your email address.",
              tone: "success"
            }
          } satisfies AuthRouteState
        });
      } catch (error) {
        setFeedback({
          text:
            error instanceof Error
              ? error.message
              : "We could not create your account. Please try again.",
          tone: "error"
        });
      }
    },
    () => {
      setFeedback({
        text: "Please fix the highlighted fields before continuing.",
        tone: "error"
      });
    }
  );

  return (
    <AuthScaffold
      banner={
        feedback
          ? { message: feedback.text, tone: feedback.tone }
          : getRouteBanner(location.state) ??
            (configurationError ? { message: configurationError, tone: "error" } : null)
      }
      footer={
        <Link className="auth-switch-link" to="/login">
          Back to login
        </Link>
      }
      subtitle="Create your account to start managing your finances."
      title="Create your account"
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthFormField
          error={shouldShowFieldError("name") ? form.formState.errors.name?.message : undefined}
          label="Full name"
          render={<input {...form.register("name")} placeholder="John Doe" type="text" />}
        />

        <AuthFormField
          error={shouldShowFieldError("email") ? form.formState.errors.email?.message : undefined}
          label="Email"
          render={<input {...form.register("email")} placeholder="JohnDoe@example.com" type="email" />}
        />

        <AuthFormField
          error={shouldShowFieldError("password") ? form.formState.errors.password?.message : undefined}
          label="Password"
          render={
            <div className="input-with-action">
              <input
                {...form.register("password")}
                placeholder="At least 8 characters"
                type={passwordVisible ? "text" : "password"}
              />
              <button
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                className="input-action"
                onClick={() => setPasswordVisible((current) => !current)}
                type="button"
              >
                {passwordVisible ? (
                  <EyeOffIcon className="input-action-icon" />
                ) : (
                  <EyeIcon className="input-action-icon" />
                )}
              </button>
            </div>
          }
        />

        <AuthFormField
          error={
            shouldShowFieldError("confirmPassword")
              ? form.formState.errors.confirmPassword?.message
              : undefined
          }
          label="Confirm password"
          render={
            <div className="input-with-action">
              <input
                {...form.register("confirmPassword")}
                placeholder="Repeat your password"
                type={confirmPasswordVisible ? "text" : "password"}
              />
              <button
                aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
                className="input-action"
                onClick={() => setConfirmPasswordVisible((current) => !current)}
                type="button"
              >
                {confirmPasswordVisible ? (
                  <EyeOffIcon className="input-action-icon" />
                ) : (
                  <EyeIcon className="input-action-icon" />
                )}
              </button>
            </div>
          }
        />

        <button className="primary-cta auth-primary-cta" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthScaffold>
  );
}
