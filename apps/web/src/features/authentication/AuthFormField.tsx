import type { ReactNode } from "react";

export function AuthFormField({
  error,
  label,
  render
}: {
  error?: string;
  label: string;
  render: ReactNode;
}) {
  return (
    <label className="field-block">
      <span>{label}</span>
      {render}
      {error ? <small>{error}</small> : null}
    </label>
  );
}
