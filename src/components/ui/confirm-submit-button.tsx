"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  message: string;
  children: ReactNode;
  className: string;
  title?: string;
};

export function ConfirmSubmitButton({
  message,
  children,
  className,
  title,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      title={title}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
