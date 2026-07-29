import { useState, useCallback } from "react";

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = "default", duration = 4000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, title, description, variant, open: true }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
