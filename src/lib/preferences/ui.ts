export type WeekStartPreference = "monday" | "sunday";
export type MotionPreference = "system" | "reduce" | "no-preference";
export type ResolvedMotionPreference = "reduce" | "no-preference";

export const UI_WEEK_START_STORAGE_KEY = "app.weekStart";
export const UI_WEEK_START_COOKIE_KEY = "app.weekStart";

export const UI_SHOW_COMPLETED_STORAGE_KEY = "app.showCompleted";
export const UI_SHOW_COMPLETED_COOKIE_KEY = "app.showCompleted";

export const UI_MOTION_STORAGE_KEY = "app.motion";
export const UI_MOTION_COOKIE_KEY = "app.motion";

export const DEFAULT_WEEK_START_PREFERENCE: WeekStartPreference = "monday";
export const DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE = true;
export const DEFAULT_MOTION_PREFERENCE: MotionPreference = "system";

export function isWeekStartPreference(value: string | null | undefined): value is WeekStartPreference {
  return value === "monday" || value === "sunday";
}

export function isMotionPreference(value: string | null | undefined): value is MotionPreference {
  return value === "system" || value === "reduce" || value === "no-preference";
}

export function parseShowCompletedPreference(value: string | null | undefined): boolean | null {
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return null;
}

export function readStoredWeekStartPreference(): WeekStartPreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(UI_WEEK_START_STORAGE_KEY);
  if (!isWeekStartPreference(stored)) {
    return null;
  }

  return stored;
}

export function readStoredShowCompletedPreference(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseShowCompletedPreference(window.localStorage.getItem(UI_SHOW_COMPLETED_STORAGE_KEY));
}

export function readStoredMotionPreference(): MotionPreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(UI_MOTION_STORAGE_KEY);
  if (!isMotionPreference(stored)) {
    return null;
  }

  return stored;
}

export function persistWeekStartPreference(preference: WeekStartPreference) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.localStorage.setItem(UI_WEEK_START_STORAGE_KEY, preference);
  document.cookie = `${UI_WEEK_START_COOKIE_KEY}=${preference}; path=/; max-age=31536000; samesite=lax`;
}

export function persistShowCompletedPreference(showCompleted: boolean) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const serialized = showCompleted ? "1" : "0";
  window.localStorage.setItem(UI_SHOW_COMPLETED_STORAGE_KEY, serialized);
  document.cookie = `${UI_SHOW_COMPLETED_COOKIE_KEY}=${serialized}; path=/; max-age=31536000; samesite=lax`;
}

export function persistMotionPreference(preference: MotionPreference) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.localStorage.setItem(UI_MOTION_STORAGE_KEY, preference);
  document.cookie = `${UI_MOTION_COOKIE_KEY}=${preference}; path=/; max-age=31536000; samesite=lax`;
}

export function getSystemResolvedMotion(): ResolvedMotionPreference {
  if (typeof window === "undefined") {
    return "no-preference";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference";
}

export function resolveMotion(preference: MotionPreference, systemMotion: ResolvedMotionPreference) {
  if (preference === "system") {
    return systemMotion;
  }

  return preference;
}

export function applyUiPreferencesToDocument(input: {
  weekStart: WeekStartPreference;
  showCompletedTasks: boolean;
  motionPreference: MotionPreference;
  resolvedMotion: ResolvedMotionPreference;
}) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-week-start", input.weekStart);
  root.setAttribute("data-show-completed", input.showCompletedTasks ? "1" : "0");
  root.setAttribute("data-motion-preference", input.motionPreference);
  root.setAttribute("data-motion", input.resolvedMotion);
}

export const uiPreferencesInitScript = `(() => {
  try {
    const root = document.documentElement;

    const storedWeekStart = window.localStorage.getItem("${UI_WEEK_START_STORAGE_KEY}");
    const weekStart = storedWeekStart === "sunday" || storedWeekStart === "monday"
      ? storedWeekStart
      : "${DEFAULT_WEEK_START_PREFERENCE}";
    root.setAttribute("data-week-start", weekStart);

    const storedShowCompleted = window.localStorage.getItem("${UI_SHOW_COMPLETED_STORAGE_KEY}");
    const showCompleted = storedShowCompleted === "0" || storedShowCompleted === "false" ? "0" : "1";
    root.setAttribute("data-show-completed", showCompleted);

    const storedMotion = window.localStorage.getItem("${UI_MOTION_STORAGE_KEY}");
    const motionPreference =
      storedMotion === "system" || storedMotion === "reduce" || storedMotion === "no-preference"
        ? storedMotion
        : "${DEFAULT_MOTION_PREFERENCE}";
    const systemMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduce"
      : "no-preference";
    const resolvedMotion = motionPreference === "system" ? systemMotion : motionPreference;

    root.setAttribute("data-motion-preference", motionPreference);
    root.setAttribute("data-motion", resolvedMotion);
  } catch {}
})();`;
