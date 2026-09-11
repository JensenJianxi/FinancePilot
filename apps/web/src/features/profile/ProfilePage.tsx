import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { ModalDialog } from "../../components/overlays/ModalDialog";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { submitSupportRequest } from "../../services/supportService";

type ProfileDialog = "email" | "password" | "support" | "username" | null;
type VerificationPhase = "details" | "done" | "verification";

export default function ProfilePage() {
  const auth = useAuth();
  const [activeDialog, setActiveDialog] = useState<ProfileDialog>(null);
  const user = auth.user;

  if (!user) {
    return null;
  }

  return (
    <div className="page-shell profile-page">
      <ScreenHeader
        actions={<Link className="inline-link" to="/more">Back to More</Link>}
        eyebrow="Profile"
        title="Profile details"
      />

      <section className="profile-layout">
        <section className="soft-card profile-summary-card">
          <div className="section-head">
            <div>
              <p className="section-label">Profile</p>
              <h3>Your account</h3>
            </div>
          </div>
          <div className="profile-readonly-grid">
            <label className="field-block">
              <span>Username</span>
              <input readOnly value={user.fullName} />
            </label>
            <label className="field-block">
              <span>Email</span>
              <input readOnly value={user.email} />
            </label>
          </div>
        </section>

        <section className="soft-card profile-security-card">
          <div className="section-head">
            <div>
              <p className="section-label">Security</p>
              <h3>Account changes</h3>
            </div>
          </div>
          <div className="profile-action-list">
            <ProfileAction
              label="Change username"
              onClick={() => setActiveDialog("username")}
            />
            <ProfileAction
              label="Change password"
              onClick={() => setActiveDialog("password")}
            />
            <ProfileAction
              label="Change email"
              onClick={() => setActiveDialog("email")}
            />
          </div>
        </section>

        <section className="soft-card profile-support-card">
          <div>
            <p className="section-label">Help</p>
            <h3>Need support?</h3>
          </div>
          <button className="secondary-cta" onClick={() => setActiveDialog("support")} type="button">
            Contact Support
          </button>
        </section>
      </section>

      {activeDialog === "username" ? (
        <ChangeUsernameDialog
          currentName={user.fullName}
          onClose={() => setActiveDialog(null)}
          requestCode={auth.requestProfileVerificationCode}
          updateUsername={auth.updateUsername}
        />
      ) : null}

      {activeDialog === "password" ? (
        <ChangePasswordDialog
          onClose={() => setActiveDialog(null)}
          requestCode={auth.requestProfileVerificationCode}
          updatePassword={auth.updatePassword}
        />
      ) : null}

      {activeDialog === "email" ? (
        <ChangeEmailDialog
          currentEmail={user.email}
          confirmEmailChange={auth.confirmEmailChange}
          onClose={() => setActiveDialog(null)}
          startEmailChange={auth.startEmailChange}
        />
      ) : null}

      {activeDialog === "support" ? (
        <SupportDialog
          defaultEmail={user.email}
          defaultName={user.fullName}
          onClose={() => setActiveDialog(null)}
        />
      ) : null}
    </div>
  );
}

function ProfileAction({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="profile-action-row" onClick={onClick} type="button">
      <span>
        <strong>{label}</strong>
      </span>
      <span aria-hidden="true" className="profile-action-arrow">→</span>
    </button>
  );
}

function ChangeUsernameDialog({
  currentName,
  onClose,
  requestCode,
  updateUsername
}: {
  currentName: string;
  onClose: () => void;
  requestCode: () => Promise<void>;
  updateUsername: (payload: { code: string; fullName: string }) => Promise<unknown>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(currentName);
  const [isPending, setIsPending] = useState(false);
  const [phase, setPhase] = useState<VerificationPhase>("details");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (phase === "details" && fullName.trim().length < 2) {
      setError("Enter the name you want FinancePilot to display.");
      return;
    }

    if (phase === "verification" && code.trim().length < 4) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsPending(true);

    try {
      if (phase === "details") {
        await requestCode();
        setPhase("verification");
      } else if (phase === "verification") {
        await updateUsername({ code, fullName: fullName.trim() });
        setPhase("done");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "FinancePilot could not update your username."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ModalDialog eyebrow="Profile security" isBusy={isPending} onClose={onClose} title="Change username">
      {phase === "done" ? (
        <SuccessPanel message="Your FinancePilot username has been updated." onDone={onClose} />
      ) : (
        <form className="manual-form profile-action-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-block">
            <span>New username</span>
            <input
              autoComplete="name"
              disabled={phase === "verification"}
              onChange={(event) => setFullName(event.target.value)}
              value={fullName}
            />
          </label>
          {phase === "verification" ? (
            <VerificationCodeField code={code} onChange={setCode} />
          ) : (
            <p className="header-copy">We will send a verification code to your current email before updating the name.</p>
          )}
          <FormFeedback error={error} />
          <button className="primary-cta" disabled={isPending} type="submit">
            {isPending ? "Please wait..." : phase === "details" ? "Send verification code" : "Verify and update"}
          </button>
        </form>
      )}
    </ModalDialog>
  );
}

function ChangePasswordDialog({
  onClose,
  requestCode,
  updatePassword
}: {
  onClose: () => void;
  requestCode: () => Promise<void>;
  updatePassword: (payload: { code: string; currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [phase, setPhase] = useState<VerificationPhase>("details");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (phase === "details") {
      if (!currentPassword || newPassword.length < 8) {
        setError("Enter your current password and a new password with at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("The new passwords do not match.");
        return;
      }
    } else if (code.trim().length < 4) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsPending(true);

    try {
      if (phase === "details") {
        await requestCode();
        setPhase("verification");
      } else if (phase === "verification") {
        await updatePassword({ code, currentPassword, newPassword });
        setPhase("done");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "FinancePilot could not update your password."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ModalDialog eyebrow="Profile security" isBusy={isPending} onClose={onClose} title="Change password">
      {phase === "done" ? (
        <SuccessPanel message="Your FinancePilot password has been updated." onDone={onClose} />
      ) : (
        <form className="manual-form profile-action-form" onSubmit={(event) => void handleSubmit(event)}>
          {phase === "details" ? (
            <>
              <PasswordField autoComplete="current-password" label="Current password" onChange={setCurrentPassword} value={currentPassword} />
              <PasswordField autoComplete="new-password" label="New password" onChange={setNewPassword} value={newPassword} />
              <PasswordField autoComplete="new-password" label="Confirm password" onChange={setConfirmPassword} value={confirmPassword} />
            </>
          ) : (
            <VerificationCodeField code={code} onChange={setCode} />
          )}
          <FormFeedback error={error} />
          <button className="primary-cta" disabled={isPending} type="submit">
            {isPending ? "Please wait..." : phase === "details" ? "Send verification code" : "Verify and update"}
          </button>
        </form>
      )}
    </ModalDialog>
  );
}

function ChangeEmailDialog({
  confirmEmailChange,
  currentEmail,
  onClose,
  startEmailChange
}: {
  confirmEmailChange: (payload: { code: string }) => Promise<unknown>;
  currentEmail: string;
  onClose: () => void;
  startEmailChange: (payload: { newEmail: string }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [phase, setPhase] = useState<VerificationPhase>("details");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (phase === "details" && (!newEmail.includes("@") || newEmail.trim() === currentEmail)) {
      setError("Enter a valid new email address.");
      return;
    }

    if (phase === "verification" && code.trim().length < 4) {
      setError("Enter the verification code sent to your new email.");
      return;
    }

    setIsPending(true);

    try {
      if (phase === "details") {
        await startEmailChange({ newEmail: newEmail.trim() });
        setPhase("verification");
      } else if (phase === "verification") {
        await confirmEmailChange({ code });
        setPhase("done");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "FinancePilot could not update your email."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ModalDialog eyebrow="Profile security" isBusy={isPending} onClose={onClose} title="Change email">
      {phase === "done" ? (
        <SuccessPanel message="Your new email address is verified and active." onDone={onClose} />
      ) : (
        <form className="manual-form profile-action-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-block">
            <span>New email</span>
            <input
              autoComplete="email"
              disabled={phase === "verification"}
              inputMode="email"
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="JohnDoe@example.com"
              type="email"
              value={newEmail}
            />
          </label>
          {phase === "verification" ? (
            <VerificationCodeField code={code} onChange={setCode} />
          ) : (
            <p className="header-copy">Cognito will send a verification code to the new address before it becomes active.</p>
          )}
          <FormFeedback error={error} />
          <button className="primary-cta" disabled={isPending} type="submit">
            {isPending ? "Please wait..." : phase === "details" ? "Send verification code" : "Confirm new email"}
          </button>
        </form>
      )}
    </ModalDialog>
  );
}

function SupportDialog({
  defaultEmail,
  defaultName,
  onClose
}: {
  defaultEmail: string;
  defaultName: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(defaultName);
  const [subject, setSubject] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.includes("@") || !subject.trim() || !message.trim()) {
      setError("Complete every support field before continuing.");
      return;
    }

    setIsPending(true);

    try {
      const delivery = await submitSupportRequest({
        email: email.trim(),
        message: message.trim(),
        name: name.trim(),
        subject: subject.trim()
      });
      setSuccess(
        delivery === "service"
          ? "Your support request was sent successfully."
          : "Your email app is ready. Review the message there and tap Send."
      );
    } catch (submitError) {
      setError(getErrorMessage(submitError, "FinancePilot could not prepare your support request."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ModalDialog eyebrow="FinancePilot support" isBusy={isPending} onClose={onClose} title="Contact Support">
      <form className="manual-form profile-action-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field-block">
          <span>Name</span>
          <input autoComplete="name" onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label className="field-block">
          <span>Email</span>
          <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </label>
        <label className="field-block">
          <span>Subject</span>
          <input onChange={(event) => setSubject(event.target.value)} value={subject} />
        </label>
        <label className="field-block">
          <span>Message</span>
          <textarea onChange={(event) => setMessage(event.target.value)} rows={5} value={message} />
        </label>
        <FormFeedback error={error} success={success} />
        <button className="primary-cta" disabled={isPending} type="submit">
          {isPending ? "Preparing message..." : "Contact Support"}
        </button>
      </form>
    </ModalDialog>
  );
}

function VerificationCodeField({ code, onChange }: { code: string; onChange: (value: string) => void }) {
  return (
    <label className="field-block">
      <span>Email verification code</span>
      <input
        autoComplete="one-time-code"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter code"
        value={code}
      />
    </label>
  );
}

function PasswordField({
  autoComplete,
  label,
  onChange,
  value
}: {
  autoComplete: "current-password" | "new-password";
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="field-block">
      <span>{label}</span>
      <input autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} type="password" value={value} />
    </label>
  );
}

function FormFeedback({ error, success }: { error?: string | null; success?: string | null }) {
  return (
    <>
      {error ? <p className="form-banner form-banner-error" role="alert">{error}</p> : null}
      {success ? <p className="form-banner form-banner-success" role="status">{success}</p> : null}
    </>
  );
}

function SuccessPanel({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div className="profile-success-panel">
      <span aria-hidden="true" className="save-check">✓</span>
      <strong>Update complete</strong>
      <p className="header-copy">{message}</p>
      <button className="primary-cta" onClick={onDone} type="button">Done</button>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
