import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../app/AuthProvider";
import type { AuthRouteState } from "../../types/auth";
import { AuthFormField } from "./AuthFormField";
import { AuthScaffold } from "./AuthScaffold";

type ForgotPasswordFormValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const { configurationError, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<null | { message: string; tone: "error" | "success" }>(
    null
  );
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email("Enter a valid email address")
      }),
    []
  );

  const form = useForm<ForgotPasswordFormValues>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get("email") ?? ""
    }
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFeedback(null);

      try {
        const result = await forgotPassword(values);

        navigate(`/reset-password?email=${encodeURIComponent(values.email)}`, {
          replace: true,
          state: {
            banner: {
              message: result.codeDeliveryDestination
                ? `Reset code sent to ${result.codeDeliveryDestination}.`
                : "Reset code sent to your email address.",
              tone: "success"
            }
          } satisfies AuthRouteState
        });
      } catch (error) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "We could not start the password reset flow.",
          tone: "error"
        });
      }
    },
    () => {
      setFeedback({
        message: "Enter your email to continue.",
        tone: "error"
      });
    }
  );

  return (
    <AuthScaffold
      banner={
        feedback
          ? feedback
          : configurationError
            ? { message: configurationError, tone: "error" }
            : null
      }
      footer={
        <Link className="auth-switch-link" to="/login">
          Back to login
        </Link>
      }
      subtitle="We&apos;ll send a verification code so you can set a new password securely."
      title="Reset your password"
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthFormField
          error={form.formState.errors.email?.message}
          label="Email"
          render={<input {...form.register("email")} placeholder="you@example.com" type="email" />}
        />

        <button className="primary-cta auth-primary-cta" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Sending code..." : "Send reset code"}
        </button>
      </form>
    </AuthScaffold>
  );
}
