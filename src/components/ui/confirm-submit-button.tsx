"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  message: string;
};

export function ConfirmSubmitButton({
  children,
  message,
  onClick,
  type = "submit",
  ...props
}: ConfirmSubmitButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
  }

  return (
    <button {...props} type={type} onClick={handleClick}>
      {children}
    </button>
  );
}
