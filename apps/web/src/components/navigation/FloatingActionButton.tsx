import { PlusIcon } from "../ui/icons";

export function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Add expense"
      className="floating-action-button"
      onClick={onClick}
      type="button"
    >
      <PlusIcon className="floating-action-icon" />
      <span>Add expense</span>
    </button>
  );
}
