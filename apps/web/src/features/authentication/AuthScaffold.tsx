import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthBanner } from "../../types/auth";

export function AuthScaffold({
  banner,
  children,
  footer,
  subtitle,
  title
}: {
  banner?: AuthBanner | null;
  children: ReactNode;
  footer?: ReactNode;
  subtitle: string;
  title: string;
}) {
  const navigate = useNavigate();
  const canGoBack = typeof window !== "undefined" && Number(window.history.state?.idx ?? 0) > 0;

  return (
    <div className="auth-page">
      <div className="auth-layout">
        {canGoBack ? (
          <button className="auth-back-link" onClick={() => navigate(-1)} type="button">
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
        ) : null}

        <section className="auth-card">
          <div className="auth-card-header">
            <div>
              <div className="auth-logo" aria-hidden="true">
                <span className="auth-logo-mark">FP</span>
                <span className="auth-logo-text">FinancePilot</span>
              </div>
              <h2>{title}</h2>
              <p className="auth-copy">{subtitle}</p>
            </div>
          </div>

          {banner ? <div className={`form-banner form-banner-${banner.tone}`}>{banner.message}</div> : null}

          {children}

          {footer ? <div className="auth-footer">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
