"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";
    const shouldRegister = process.env.NODE_ENV === "production" || registerInDev;

    if (!shouldRegister) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await registration.update().catch(() => undefined);
      } catch {
        // Keep silent to avoid noisy console logs for users.
      }
    };

    if (document.readyState === "complete") {
      void registerServiceWorker();
      return;
    }

    const onLoad = () => {
      void registerServiceWorker();
    };
    window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
