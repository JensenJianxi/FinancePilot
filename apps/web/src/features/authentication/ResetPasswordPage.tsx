import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { EyeIcon, EyeOffIcon } from "../../components/ui/icons";
import { useAuth } from "../../app/AuthProvider";
import type { AuthBanner, AuthRouteState } from "../../types/auth";
import { AuthFormField } from "./AuthFormField";
import { AuthScaffold } from "./AuthScaffold";

type ResetPasswordFormValues = {
  code: string;
  confirmPassword: string;
  email: string;
  password: string;
};

function getRouteBanner(state: unknown): AuthBanner | null {
  const routeState = state as AuthRouteState | null;
  return routeState?.banner ?? null;
}

export default function ResetPasswordPage() {
  const { configurationError, resetPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<AuthBanner | null>(getRouteBanner(location.state));
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const schema = useMemo(
    () =>
      z
        .object({
          code: z.string().trim().min(6, "Enter the verification code"),
          confirmPassword: z.string().min(8, "Confirm your new password"),
          email: z.string().email("Enter a valid email address"),
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

  const form = useForm<ResetPasswordFormValues>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      confirmPassword: "",
      email: searchParams.get("email") ?? "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFeedback(null);

      try {
        await resetPassword({
          code: values.code,
          email: values.email,
          newPassword: values.password
        });

        navigate("/login", {
          replace: true,
          state: {
            banner: {
              message: "Password updated. Sign in with your new password.",
              tone: "success"
            }
          } satisfies AuthRouteState
        });
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "We could not reset your password.",
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
        <div className="auth-footer-links">
          <Link className="auth-switch-link" to="/forgot-password">
            Request another code
          </Link>
          <Link className="auth-switch-link" to="/login">
            Back to login
          </Link>
        </div>
      }
      subtitle="Enter the verification code from your email and choose a new password."
      title="Create a new password"
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthFormField
          error={form.formState.errors.email?.message}
          label="Email"
          render={<input {...form.register("email")} placeholder="you@example.com" type="email" />}
        />

        <AuthFormField
          error={form.formState.errors.code?.message}
          label="Verification code"
          render={<input {...form.register("code")} inputMode="numeric" placeholder="123456" type="text" />}
        />

        <AuthFormField
          error={form.formState.errors.password?.message}
          label="New password"
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
          error={form.formState.errors.confirmPassword?.message}
          label="Confirm new password"
          render={
            <div className="input-with-action">
              <input
                {...form.register("confirmPassword")}
                placeholder="Repeat your new password"
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
          {form.formState.isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthScaffold>
  );
}
