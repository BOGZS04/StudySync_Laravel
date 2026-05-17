import React from "react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  isLoading = false,
  onClose,
  onConfirm,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    primaryAction={{
      label: confirmLabel,
      onClick: onConfirm,
      isLoading,
      loadingText: "Working...",
      variant: "danger",
      iconName: "FaTriangleExclamation",
    }}
    secondaryAction={{
      label: "Cancel",
      onClick: onClose,
      variant: "secondary",
    }}
  >
    <p className="text-sm font-medium leading-relaxed text-text-muted">{message}</p>
  </Modal>
);

export default ConfirmModal;
