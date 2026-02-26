"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SheetA11yBridgeProps = {
  closeHref: string;
  initialFocusId?: string;
};

export function SheetA11yBridge({ closeHref, initialFocusId }: SheetA11yBridgeProps) {
  const router = useRouter();

  useEffect(() => {
    if (initialFocusId) {
      requestAnimationFrame(() => {
        const focusTarget = document.getElementById(initialFocusId);
        focusTarget?.focus();
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      router.replace(closeHref);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeHref, initialFocusId, router]);

  return null;
}
