import React, { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const showError = useCallback(
    (message: string) => addToast(message, "error", 8000),
    [addToast]
  );

  const showSuccess = useCallback(
    (message: string) => addToast(message, "success", 3000),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showError, showSuccess }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps): React.ReactElement | null {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  const bgColor = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-amber-600",
    info: "bg-blue-600",
  }[toast.type];

  const icon = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[400px] animate-slide-in`}
      role="alert"
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/80 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default ToastProvider;
