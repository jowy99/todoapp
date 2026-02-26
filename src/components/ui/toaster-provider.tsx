"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useT } from "@/components/settings/locale-provider";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
type TimeoutHandle = ReturnType<typeof setTimeout>;

function iconForVariant(variant: ToastVariant) {
  if (variant === "success") {
    return "✓";
  }
  if (variant === "error") {
    return "!";
  }
  return "i";
}

function durationForVariant(variant: ToastVariant) {
  if (variant === "error") {
    return 5000;
  }
  return 4000;
}

export function ToasterProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, TimeoutHandle>>(new Map());

  useEffect(() => {
    const activeTimeouts = timeoutsRef.current;
    return () => {
      for (const timeout of activeTimeouts.values()) {
        clearTimeout(timeout);
      }
      activeTimeouts.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, message, variant = "info", durationMs }: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextToast: ToastItem = {
        id,
        title,
        message,
        variant,
        durationMs,
      };

      setToasts((prev) => [...prev.slice(-2), nextToast]);

      const timeout = setTimeout(() => {
        dismissToast(id);
      }, durationMs ?? durationForVariant(variant));
      timeoutsRef.current.set(id, timeout);

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="app-toast-stack" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.variant}`}
            role={toast.variant === "error" ? "alert" : "status"}
            aria-live={toast.variant === "error" ? "assertive" : "polite"}
          >
            <span className="app-toast__icon" aria-hidden>
              {iconForVariant(toast.variant)}
            </span>
            <div className="min-w-0">
              <p className="app-toast__title">{toast.title ?? t("app.title")}</p>
              <p className="app-toast__message">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={t("toast.dismiss")}
              className="app-toast__close"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useAppToast must be used within ToasterProvider.");
  }

  return context;
}
