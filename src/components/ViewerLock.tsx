"use client";

import { useEffect } from "react";

export function ViewerLock() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const meta = event.metaKey || event.ctrlKey;
      if (event.key === "PrintScreen") {
        event.preventDefault();
        return;
      }
      if (meta && ["c", "p", "s", "u", "a"].includes(key)) {
        event.preventDefault();
      }
      if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) {
        event.preventDefault();
      }
      if (key === "f12") event.preventDefault();
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      event.clipboardData?.setData("text/plain", "");
    };

    document.addEventListener("contextmenu", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeprint", prevent);

    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeprint", prevent);
    };
  }, []);

  return null;
}
