import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalPageLock } from "../overlays/useModalPageLock";

export function ConfirmationDialog({
  confirmLabel = "Confirm",
  description,
  isConfirmPending = false,
  onCancel,
  onConfirm,
  title
}: {
  confirmLabel?: string;
  description: ReactNode;
  isConfirmPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  useModalPageLock();

  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirmPending) {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirmPending, onCancel]);

  return createPortal(
    <div
      className="install-modal-backdrop confirmation-backdrop"
      onClick={isConfirmPending ? undefined : onCancel}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="install-modal-sheet confirmation-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="section-head">
          <div>
            <p className="section-label">Confirm action</p>
            <h2 id={titleId}>{title}</h2>
          </div>
        </div>
        <div className="header-copy confirmation-description">{description}</div>
        <div className="dialog-actions">
          <button
            className="secondary-cta"
            disabled={isConfirmPending}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="primary-cta danger-cta"
            disabled={isConfirmPending}
            onClick={onConfirm}
            type="button"
          >
            {isConfirmPending ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
