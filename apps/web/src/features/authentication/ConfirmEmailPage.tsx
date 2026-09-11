import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../app/AuthProvider";
import type { AuthBanner, AuthRouteState } from "../../types/auth";
import { AuthFormField } from "./AuthFormField";
import { AuthScaffold } from "./AuthScaffold";

type ConfirmEmailFormValues = {
  code: string;
  email: string;
};

function getRouteBanner(state: unknown): AuthBanner | null {
  const routeState = state as AuthRouteState | null;
  return routeState?.banner ?? null;
}

export default function ConfirmEmailPage() {
  const { confirmEmail, configurationError, resendConfirmationCode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<AuthBanner | null>(getRouteBanner(location.state));
  const [isResending, setIsResending] = useState(false);
  const schema = useMemo(
    () =>
      z.object({
        code: z.string().trim().min(6, "Enter the 6-digit verification code"),
        email: z.string().email("Enter a valid email address")
      }),
    []
  );

  const form = useForm<ConfirmEmailFormValues>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      email: searchParams.get("email") ?? ""
    }
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFeedback(null);

      try {
        await confirmEmail(values);
        navigate("/login", {
          replace: true,
          state: {
            banner: {
              message: "Email confirmed. You can sign in now.",
              tone: "success"
            }
          } satisfies AuthRouteState
        });
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm your email. Please try again.",
          tone: "error"
        });
      }
    },
    () => {
      setFeedback({
        message: "Please enter both your email and verification code.",
        tone: "error"
      });
    }
  );

  async function handleResend() {
    const isEmailValid = await form.trigger("email");

    if (!isEmailValid) {
      setFeedback({
        message: "Enter a valid email address before requesting another code.",
        tone: "error"
      });
      return;
    }

    setIsResending(true);
    setFeedback(null);

    try {
      await resendConfirmationCode(form.getValues("email"));
      setFeedback({
        message: "A fresh confirmation code has been sent.",
        tone: "success"
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "We could not resend the confirmation code right now.",
        tone: "error"
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthScaffold
      banner={feedback ?? (configurationError ? { message: configurationError, tone: "error" } : null)}
      footer={
        <div className="auth-footer-links">
          <Link className="auth-switch-link" to="/login">
            Back to login
          </Link>
          <Link className="auth-switch-link" to="/register">
            Create account
          </Link>
        </div>
      }
      subtitle="Enter the verification code from your inbox to finish creating your account."
      title="Confirm your email"
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

        <button className="primary-cta auth-primary-cta" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Confirming..." : "Verify email"}
        </button>

        <div className="auth-inline-row auth-support-row">
          <span className="auth-inline-copy">Didn&apos;t get the code?</span>
          <button className="text-button" disabled={isResending} onClick={handleResend} type="button">
            {isResending ? "Sending..." : "Resend code"}
          </button>
        </div>
      </form>
    </AuthScaffold>
  );
}
