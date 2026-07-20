import React, { useEffect, type JSX } from "react";
import { IconClose } from "./icons.js";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer: JSX.Element;
  children: React.ReactElement | React.ReactElement[];
  size?: "lg" | "xl" | "wide";
}

export default function Modal({
  open,
  title,
  onClose,
  footer,
  children,
  size,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: any) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={
          size === "wide"
            ? { width: "75vw", maxWidth: "75vw" }
            : size === "xl"
            ? { maxWidth: 780 }
            : size === "lg"
            ? { maxWidth: 620 }
            : undefined
        }
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
