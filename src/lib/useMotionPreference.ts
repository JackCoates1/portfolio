import { useEffect, useState } from "react";

const key = "portfolio-motion-paused";
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)");
const savedPause = () => {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

/** Remember an explicit pause without making storage a requirement for the UI. */
export function useMotionPreference() {
  const [paused, setPaused] = useState(
    () => reducedMotion().matches || savedPause(),
  );
  useEffect(() => {
    const media = reducedMotion();
    const refresh = () => setPaused(media.matches || savedPause());
    const storageChanged = (event: StorageEvent) => {
      if (event.key === key || event.key === null) refresh();
    };
    media.addEventListener("change", refresh);
    window.addEventListener("storage", storageChanged);
    return () => {
      media.removeEventListener("change", refresh);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);
  const toggleMotion = () => {
    const next = !paused;
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      // Private/blocked storage must not stop the current-page control working.
    }
    setPaused(next);
  };
  return { paused, toggleMotion };
}
