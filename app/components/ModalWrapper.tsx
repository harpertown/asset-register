import React from "react";

interface ModalWrapperProps {
  isOpen: boolean;
  onClose?: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shared modal wrapper component with backdrop and centered positioning.
 * Used by all modal components for consistent styling and behavior.
 */
export default function ModalWrapper({
  isOpen,
  onClose,
  maxWidth = "max-w-lg",
  children,
}: ModalWrapperProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-lg p-6 shadow-xl ${maxWidth} w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
